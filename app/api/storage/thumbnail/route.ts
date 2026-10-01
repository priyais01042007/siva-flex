import { NextRequest, NextResponse } from "next/server";
import { authorizeFileAccess } from "@/app/api/storage/signed-url/route";
import { GET as getAdminThumbnail } from "@/app/api/admin/live-files/thumbnail/route";

/**
 * GET /api/storage/thumbnail?path=...
 * Shared, multi-tenant authenticated thumbnail route for both Dealers and Admins.
 * Enforces server-side IDOR authorization: dealers can only view their own thumbnails.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return new NextResponse("Missing path parameter", { status: 400 });
    }

    // Strictly enforce session and tenant ownership
    const auth = await authorizeFileAccess(filePath);
    if (!auth.authorized) {
      return new NextResponse(auth.error || "Access Denied", { status: auth.status });
    }

    // Serve optimized thumbnail from RAM cache or Supabase Storage
    return await getAdminThumbnail(req);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error generating thumbnail";
    return new NextResponse(msg, { status: 500 });
  }
}
