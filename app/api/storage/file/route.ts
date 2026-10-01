import { NextRequest, NextResponse } from "next/server";
import { authorizeFileAccess, extractCleanStoragePath } from "../signed-url/route";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import fs from "fs";
import path from "path";

/**
 * GET /api/storage/file?path=...&dealerId=...&adminId=...&download=...
 * Authenticates request, generates signed URL on Supabase, and redirects.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");
    const download = searchParams.get("download");
    const filename = searchParams.get("name");

    if (!filePath) {
      return new NextResponse("Missing file path", { status: 400 });
    }

    // 1. Strictly verify authorization via server-side session
    const authResult = await authorizeFileAccess(filePath);
    if (!authResult.authorized) {
      return new NextResponse(authResult.error || "Access Denied", {
        status: authResult.status,
      });
    }

    const cleanPath = extractCleanStoragePath(filePath);

    // 2. Check if file is stored in Supabase private bucket
    // Generate temporary signed URL (valid for 1 hour)
    const options = download
      ? { download: filename || true }
      : undefined;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(cleanPath, 3600, options);

    if (data?.signedUrl) {
      // Redirect browser to the private cryptographically signed URL
      return NextResponse.redirect(data.signedUrl);
    }

    // 3. Fallback for legacy local disk files (e.g. /uploads/...)
    const rel = filePath.replace(/^\/+/, "");
    const diskPath = path.join(process.cwd(), "public", rel);
    if (fs.existsSync(diskPath)) {
      const buffer = fs.readFileSync(diskPath);
      const ext = path.extname(diskPath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
      };
      const contentType = mimeTypes[ext] || "application/octet-stream";
      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Cache-Control", "private, max-age=3600");
      if (download) {
        headers.set("Content-Disposition", `attachment; filename="${filename || path.basename(diskPath)}"`);
      }
      return new NextResponse(buffer, { headers });
    }

    return new NextResponse(error?.message || "File not found in storage", { status: 404 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error accessing storage file";
    return new NextResponse(msg, { status: 500 });
  }
}
