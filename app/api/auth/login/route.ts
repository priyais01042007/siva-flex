import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { createSession, getSessionCookieAttributes, verifyPassword, hashPassword, CUSTOMER_SESSION_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from "@/lib/auth";
import { signAuthToken } from "@/lib/token";
import { loginRateLimiter } from "@/lib/rate-limiter";
import { extractClientMeta, logAudit } from "@/lib/audit";
import { LoginSchema } from "@/lib/security";

export async function POST(req: Request) {
  const meta = extractClientMeta(req);

  try {
    // 1. Rate Limiting Check (5 failed attempts per 15 minutes per IP)
    const rateCheck = loginRateLimiter.check(meta.ipAddress);
    if (!rateCheck.allowed) {
      await logAudit({
        action: "RATE_LIMIT_TRIGGERED",
        description: `Login rate limit exceeded. IP: ${meta.ipAddress}`,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        req,
      });

      return NextResponse.json(
        {
          error: `Too many login attempts. Please wait ${rateCheck.resetInSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    // 2. Validate Input Payload using Zod
    const body = await req.json();
    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid email or password format." },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;
    const cleanEmail = email.toLowerCase().trim();

    // 3. Lookup user in secure public.users table
    let userRows = await sql`
      SELECT 
        u.id, 
        u.email, 
        u.password_hash, 
        u.role, 
        u.dealer_id, 
        u.status,
        u.must_change_password,
        c.customer_name,
        c.customer_mobile_number,
        c.customer_gst_number
      FROM public.users u
      LEFT JOIN public.customer c ON u.dealer_id = c.customer_id
      WHERE LOWER(TRIM(u.email)) = ${cleanEmail}
        AND u.role = 'dealer'
      LIMIT 1;
    `;

    let user: any = userRows[0];

    // Seamless migration fallback: If not in users table yet, check legacy public.customer
    if (!user) {
      const legacy = await sql`
        SELECT customer_id, customer_name, customer_mail_id, customer_password, customer_status, customer_mobile_number, customer_gst_number
        FROM public.customer
        WHERE LOWER(TRIM(customer_mail_id)) = ${cleanEmail}
        LIMIT 1;
      `;

      if (legacy.length > 0 && legacy[0].customer_password === password) {
        // Migrate into users table immediately with bcrypt
        const hashed = await hashPassword(password, 10);
        const status = legacy[0].customer_status === 1 ? "active" : (legacy[0].customer_status === 0 ? "pending" : "suspended");
        const inserted = await sql`
          INSERT INTO public.users (email, password_hash, role, dealer_id, status)
          VALUES (${cleanEmail}, ${hashed}, 'dealer', ${legacy[0].customer_id}, ${status})
          RETURNING id, email, password_hash, role, dealer_id, status, must_change_password;
        `;
        user = {
          ...inserted[0],
          customer_name: legacy[0].customer_name,
          customer_mobile_number: legacy[0].customer_mobile_number,
          customer_gst_number: legacy[0].customer_gst_number,
        };
      }
    }

    if (!user) {
      await logAudit({
        action: "LOGIN_FAILED",
        description: `Failed dealer login attempt for: ${cleanEmail} (Account not found)`,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        req,
      });

      return NextResponse.json(
        { error: "Invalid Email ID or Password." },
        { status: 401 }
      );
    }

    // 4. Verify password with bcrypt
    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      await logAudit({
        userId: user.id,
        action: "LOGIN_FAILED",
        description: `Failed dealer login attempt for: ${cleanEmail} (Incorrect password)`,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        req,
      });

      return NextResponse.json(
        { error: "Invalid Email ID or Password." },
        { status: 401 }
      );
    }

    // 5. Account status check
    if (user.status === "pending") {
      return NextResponse.json(
        { error: "Your dealer account is awaiting administrator activation." },
        { status: 403 }
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "This dealer account has been suspended. Please contact Siva Flex Palani." },
        { status: 403 }
      );
    }

    // 6. Reset rate limit counter upon successful authentication
    loginRateLimiter.reset(meta.ipAddress);

    // 7. Create database session (Hard limit 3 hours for customer)
    const { rawToken } = await createSession(user.id, req, "dealer");

    // 8. Generate signed role token for Edge Middleware verification
    const roleToken = await signAuthToken({
      userId: user.id,
      role: "dealer",
      dealerId: user.dealer_id,
      email: user.email,
    });

    // 9. Log successful login
    await logAudit({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      description: `Dealer login successful: ${user.customer_name || user.email}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      req,
    });

    // 10. Prepare secure response with HTTP-only cookies
    const response = NextResponse.json({
      success: true,
      message: `Welcome back, ${user.customer_name || "Dealer"}!`,
      user: {
        id: user.dealer_id || user.id,
        name: user.customer_name || "Dealer",
        email: user.email,
        mobile: user.customer_mobile_number ? String(user.customer_mobile_number) : "",
        gst: user.customer_gst_number || "",
        mustChangePassword: Boolean(user.must_change_password),
      },
    });

    const isProduction = process.env.NODE_ENV === "production";

    // Set Primary Session Cookie (3 hours limit)
    response.cookies.set({
      ...getSessionCookieAttributes(rawToken, "dealer"),
    });

    // Set Signed Edge Middleware Companion Cookie (3 hours limit)
    response.cookies.set({
      name: "siva_auth_meta",
      value: roleToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error: unknown) {
    console.error("[DEALER LOGIN ERROR]:", error);
    return NextResponse.json(
      { error: "Authentication system encountered an error. Please try again." },
      { status: 500 }
    );
  }
}
