import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.dealerId || user.id,
        uuid: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        mobile: user.mobile,
        gst: user.gst,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
