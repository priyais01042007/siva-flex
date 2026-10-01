import { NextResponse, type NextRequest } from "next/server";
import { verifyAuthToken } from "./lib/token";

const SESSION_COOKIE_NAME = "siva_session";
const ROLE_COOKIE_NAME = "siva_auth_meta";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Skip static assets, favicon, Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/cron") ||
    pathname.includes(".") // static files like .png, .jpg, .ico
  ) {
    return NextResponse.next();
  }

  // 2. Read authentication cookies
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const roleToken = req.cookies.get(ROLE_COOKIE_NAME)?.value;

  let authUser: { role: string; dealerId?: number; email?: string } | null = null;
  if (roleToken) {
    authUser = await verifyAuthToken(roleToken);
  }

  const isAuthenticated = Boolean(sessionToken && authUser);

  // ==========================================
  // A. ADMIN PROTECTED ROUTES (/admin/*)
  // ==========================================
  const isAdminLogin = pathname === "/admin/login" || pathname === "/admin";
  const isAdminProtected = pathname.startsWith("/admin") && !isAdminLogin;

  if (isAdminProtected) {
    // 1. Not logged in -> redirect to admin login
    if (!isAuthenticated) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 2. Logged in as dealer -> 403 Forbidden!
    if (authUser?.role !== "admin") {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
        <head><title>403 Forbidden</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 4rem;">
          <h1 style="color: #dc2626;">403 Forbidden</h1>
          <p>Access Denied. Administrative privileges required to access this portal.</p>
          <a href="/customer/send-file" style="color: #0284c7; font-weight: bold;">Return to Dealer Portal</a>
        </body>
        </html>`,
        {
          status: 403,
          headers: { "Content-Type": "text/html" },
        }
      );
    }
  }

  // If already logged in as admin and visiting /admin/login, redirect to /admin/live-files
  if (isAdminLogin && isAuthenticated && authUser?.role === "admin") {
    return NextResponse.redirect(new URL("/admin/live-files", req.url));
  }

  // ==========================================
  // B. DEALER PROTECTED ROUTES (/customer/*, /dealer/*, /orders/*, /files/*)
  // ==========================================
  const isDealerProtected =
    pathname.startsWith("/customer") ||
    pathname.startsWith("/dealer") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/files");

  if (isDealerProtected) {
    // Not logged in -> redirect to dealer login on home page
    if (!isAuthenticated) {
      const homeUrl = new URL("/", req.url);
      homeUrl.searchParams.set("auth", "required");
      homeUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(homeUrl);
    }
  }

  // ==========================================
  // C. API PROTECTION (/api/admin/* and /api/customer/*)
  // ==========================================
  if (pathname.startsWith("/api/admin")) {
    const isPublicAdminApi = pathname === "/api/admin/auth/login";
    if (!isPublicAdminApi) {
      if (!isAuthenticated) {
        return NextResponse.json(
          { error: "Unauthorized: Missing administrative session." },
          { status: 401 }
        );
      }
      if (authUser?.role !== "admin") {
        return NextResponse.json(
          { error: "Forbidden: Administrative role required." },
          { status: 403 }
        );
      }
    }
  }

  if (pathname.startsWith("/api/customer") && !pathname.startsWith("/api/customer/upload/public")) {
    const isPublicCustomerApi =
      pathname === "/api/customer/flux-types" ||
      pathname === "/api/auth/login" ||
      pathname === "/api/auth/register";

    if (!isPublicCustomerApi && !isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required." },
        { status: 401 }
      );
    }
  }

  // 3. Inject Security Headers
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/customer/:path*",
    "/dealer/:path*",
    "/orders/:path*",
    "/files/:path*",
    "/api/admin/:path*",
    "/api/customer/:path*",
  ],
};
