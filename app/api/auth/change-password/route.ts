import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword, invalidateUserSessions, SESSION_COOKIE_NAME } from "@/lib/auth";
import { ChangePasswordSchema } from "@/lib/security";
import { extractClientMeta, logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const meta = extractClientMeta(req);

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Please sign in." }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = ChangePasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid password data." },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parseResult.data;

    // Fetch user password_hash
    const rows = await sql`
      SELECT password_hash FROM public.users
      WHERE id = ${user.id}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const isMatch = await verifyPassword(currentPassword, rows[0].password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword, user.role === "admin" ? 12 : 10);

    await sql`
      UPDATE public.users
      SET 
        password_hash = ${newHash},
        must_change_password = FALSE,
        updated_at = NOW()
      WHERE id = ${user.id};
    `;

    // Revoke any other concurrent sessions on other devices for security
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    await invalidateUserSessions(user.id, currentToken);

    await logAudit({
      userId: user.id,
      action: "PASSWORD_CHANGE",
      description: `User changed password: ${user.email}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Password successfully updated.",
    });
  } catch (error) {
    console.error("[CHANGE PASSWORD ERROR]:", error);
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}
