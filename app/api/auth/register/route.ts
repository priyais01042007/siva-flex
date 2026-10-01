import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { RegisterSchema } from "@/lib/security";
import { loginRateLimiter } from "@/lib/rate-limiter";
import { extractClientMeta, logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const meta = extractClientMeta(req);

  try {
    // 1. Rate Limiting Check
    const rateCheck = loginRateLimiter.check(meta.ipAddress);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    // 2. Validate Input Payload using Zod
    const body = await req.json();
    const parseResult = RegisterSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid registration information." },
        { status: 400 }
      );
    }

    const { name, email, mobile, address, gst, password } = parseResult.data;
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.toUpperCase().trim();
    const cleanMobile = parseInt(mobile.replace(/[^0-9]/g, ""), 10);

    // 3. Check for existing email in public.users or public.customer
    const existingUser = await sql`
      SELECT id FROM public.users 
      WHERE LOWER(TRIM(email)) = ${cleanEmail}
      LIMIT 1;
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "This Email ID is already registered. Please sign in." },
        { status: 409 }
      );
    }

    // 4. Hash password with bcrypt
    const hashedPassword = await hashPassword(password, 10);

    // 5. Get next available customer_id for legacy linkage
    const maxRow = await sql`SELECT COALESCE(MAX(customer_id), 0) + 1 AS next_id FROM public.customer;`;
    const nextDealerId = maxRow[0].next_id;
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    // 6. Insert into public.customer
    await sql`
      INSERT INTO public.customer (
        customer_id,
        customer_name,
        customer_mail_id,
        customer_mobile_number,
        customer_address,
        customer_password,
        customer_status,
        customer_datetime,
        customer_gst_number
      ) VALUES (
        ${nextDealerId},
        ${cleanName},
        ${cleanEmail},
        ${cleanMobile},
        ${address || "Palani"},
        ${"[ENCRYPTED_BCRYPT]"},
        1,
        ${now},
        ${gst || ""}
      );
    `;

    // 7. Insert into public.users
    const insertedUser = await sql`
      INSERT INTO public.users (
        email,
        password_hash,
        role,
        dealer_id,
        status,
        must_change_password
      ) VALUES (
        ${cleanEmail},
        ${hashedPassword},
        'dealer',
        ${nextDealerId},
        'active',
        FALSE
      )
      RETURNING id;
    `;

    // 8. Log Audit Event
    await logAudit({
      userId: insertedUser[0]?.id,
      action: "DEALER_CREATION",
      description: `New dealer registered: ${cleanName} (${cleanEmail}) - Dealer ID: ${nextDealerId}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Registration successful! You can now sign in with your credentials.",
      dealerId: nextDealerId,
    });
  } catch (error: unknown) {
    console.error("[REGISTER ERROR]:", error);
    const message = error instanceof Error ? error.message : "Registration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
