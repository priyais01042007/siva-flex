import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { invalidateSession, SESSION_COOKIE_NAME, getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = await getCurrentUser();

    if (token) {
      await invalidateSession(token, user?.id, req);
    }

    const res = NextResponse.json({
      success: true,
      message: "Successfully signed out.",
    });

    // Clear session cookies
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      path: "/",
      maxAge: 0,
    });

    res.cookies.set({
      name: "siva_auth_meta",
      value: "",
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (error) {
    console.error("[LOGOUT ERROR]:", error);
    return NextResponse.json({ success: false, error: "Logout failed" }, { status: 500 });
  }
}
