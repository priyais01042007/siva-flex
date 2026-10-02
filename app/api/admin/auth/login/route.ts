import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { createSession, getSessionCookieAttributes, verifyPassword, hashPassword, ADMIN_SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { signAuthToken } from "@/lib/token";
import { loginRateLimiter } from "@/lib/rate-limiter";
import { extractClientMeta, logAudit } from "@/lib/audit";
import { LoginSchema } from "@/lib/security";

export async function POST(req: Request) {
  const meta = extractClientMeta(req);

  try {
    // 1. Rate Limiting Check (5 attempts per 15 minutes per IP)
    const rateCheck = loginRateLimiter.check(meta.ipAddress);
    if (!rateCheck.allowed) {
      await logAudit({
        action: "RATE_LIMIT_TRIGGERED",
        description: `Admin login rate limit exceeded. IP: ${meta.ipAddress}`,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        req,
      });

      return NextResponse.json(
        {
          error: `Too many login attempts. Access temporarily restricted. Try again in ${rateCheck.resetInSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    // 2. Validate Input Payload using Zod
    const body = await req.json();
    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid email or password." },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;
    const cleanEmail = email.toLowerCase().trim();

    // 3. Query user from public.users table
    let adminRows = await sql`
      SELECT id, email, password_hash, role, status
      FROM public.users
      WHERE LOWER(TRIM(email)) = ${cleanEmail}
        AND role = 'admin'
      LIMIT 1;
    `;

    // Seamless fallback: If not in users yet, check legacy public.admin table
    if (adminRows.length === 0) {
      const legacy = await sql`
        SELECT admin_id, admin_mailid, admin_password, admin_status
        FROM public.admin
        WHERE LOWER(TRIM(admin_mailid)) = ${cleanEmail}
        LIMIT 1;
      `;

      if (legacy.length > 0 && legacy[0].admin_password === password) {
        const hashed = await hashPassword(password, 12);
        const inserted = await sql`
          INSERT INTO public.users (email, password_hash, role, status)
          VALUES (${cleanEmail}, ${hashed}, 'admin', ${legacy[0].admin_status === 1 ? 'active' : 'suspended'})
          RETURNING id, email, password_hash, role, status;
        `;
        adminRows = inserted;
      }
    }

    if (adminRows.length === 0) {
      await logAudit({
        action: "LOGIN_FAILED",
        description: `Admin login failure for: ${cleanEmail} (Account not found)`,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        req,
      });

      return NextResponse.json(
        { error: "Invalid Admin Credentials. Access denied." },
        { status: 401 }
      );
    }

    const admin = adminRows[0];

    // 4. Verify password with bcrypt
    const passwordMatch = await verifyPassword(password, admin.password_hash);
    if (!passwordMatch) {
      await logAudit({
        userId: admin.id,
        action: "LOGIN_FAILED",
        description: `Admin login failure for: ${cleanEmail} (Incorrect password)`,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        req,
      });

      return NextResponse.json(
        { error: "Invalid Admin Credentials. Access denied." },
        { status: 401 }
      );
    }

    // 5. Check admin status
    if (admin.status !== "active") {
      return NextResponse.json(
        { error: "This administrative account is currently disabled." },
        { status: 403 }
      );
    }

    // 6. Reset rate limit counter on success
    loginRateLimiter.reset(meta.ipAddress);

    // 7. Create database session (Hard limit 1 day for admin)
    const { rawToken } = await createSession(admin.id, req, "admin");

    // 8. Sign role token for Edge Middleware
    const roleToken = await signAuthToken({
      userId: admin.id,
      role: "admin",
      email: admin.email,
    });

    // 9. Log audit event
    await logAudit({
      userId: admin.id,
      action: "LOGIN_SUCCESS",
      description: `Admin signed in: ${admin.email}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      req,
    });

    // 10. Prepare secure response with HTTP-only cookies
    const response = NextResponse.json({
      success: true,
      message: "Admin authentication successful.",
      admin: {
        id: admin.id,
        email: admin.email,
        role: "admin",
      },
    });

    const isProduction = process.env.NODE_ENV === "production";

    // Set Primary Session Cookie (1 day expiry)
    response.cookies.set({
      ...getSessionCookieAttributes(rawToken, "admin"),
    });

    // Set Signed Edge Middleware Companion Cookie (1 day expiry)
    response.cookies.set({
      name: "siva_auth_meta",
      value: roleToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error: unknown) {
    console.error("[ADMIN LOGIN ERROR]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
