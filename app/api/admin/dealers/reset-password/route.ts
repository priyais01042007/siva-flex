import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { AdminResetPasswordSchema } from "@/lib/security";
import { extractClientMeta, logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const meta = extractClientMeta(req);

  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Administrative privilege required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = AdminResetPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid payload." },
        { status: 400 }
      );
    }

    const { dealerId, newPassword } = parseResult.data;

    // Check if dealer exists
    const dealerRows = await sql`
      SELECT id, email FROM public.users
      WHERE dealer_id = ${dealerId} AND role = 'dealer'
      LIMIT 1;
    `;

    if (dealerRows.length === 0) {
      return NextResponse.json({ error: `Dealer #${dealerId} not found.` }, { status: 404 });
    }

    const dealer = dealerRows[0];
    const newHash = await hashPassword(newPassword, 10);

    // Update dealer in users table and set must_change_password = true
    await sql`
      UPDATE public.users
      SET 
        password_hash = ${newHash},
        must_change_password = TRUE,
        updated_at = NOW()
      WHERE id = ${dealer.id};
    `;

    // Terminate any existing sessions of this dealer to force re-login
    await sql`
      DELETE FROM public.sessions
      WHERE user_id = ${dealer.id};
    `;

    await logAudit({
      userId: admin.id,
      action: "PASSWORD_RESET",
      description: `Admin ${admin.email} reset password for dealer #${dealerId} (${dealer.email}). Force password change enabled.`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Password for dealer #${dealerId} has been successfully reset. The dealer will be required to change it on their next login.`,
    });
  } catch (error) {
    console.error("[ADMIN RESET PASSWORD ERROR]:", error);
    return NextResponse.json({ error: "Failed to reset dealer password." }, { status: 500 });
  }
}
