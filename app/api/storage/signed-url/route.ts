import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

/**
 * Helper to clean a storage path into a relative key inside customer-files bucket
 */
export function extractCleanStoragePath(inputPath: string): string {
  if (!inputPath) return "";
  let clean = inputPath.trim();

  // Strip Supabase CDN URL prefix if present
  if (clean.includes("customer-files/")) {
    clean = clean.split("customer-files/")[1];
  }

  // Remove query parameters or tokens
  if (clean.includes("?")) {
    clean = clean.split("?")[0];
  }

  // Remove leading slashes
  clean = clean.replace(/^\/+/, "");

  return clean;
}

/**
/**
 * Authorize requester against requested file path using verified server session.
 * Rules:
 * - Admin: can access all dealer files.
 * - Dealers: can ONLY access files in their own folder (dealer_{dealer_id}/...).
 * - Unauthenticated: rejected (401).
 * - IDOR: Dealer cannot access other dealers' files (403).
 */
export async function authorizeFileAccess(
  filePath: string
): Promise<{ authorized: boolean; status: number; error?: string }> {
  const cleanPath = extractCleanStoragePath(filePath);

  if (!cleanPath) {
    return { authorized: false, status: 400, error: "Missing or invalid file path." };
  }

  // 1. Strictly verify Server-Side Session from secure HTTP-only cookies
  const user = await getCurrentUser();

  if (!user) {
    return {
      authorized: false,
      status: 401,
      error: "Unauthorized: Valid authentication session required to access private storage files.",
    };
  }

  // 2. Administrators have global access across all tenant files
  if (user.role === "admin") {
    return { authorized: true, status: 200 };
  }

  // 3. Dealers are strictly restricted to their own customer folder and files
  if (user.role === "dealer") {
    const dId = Number(user.dealerId);
    if (!dId) {
      return {
        authorized: false,
        status: 403,
        error: "Forbidden: No valid dealer profile attached to this session.",
      };
    }

    // Check directory prefix: dealer_{dId}/...
    const match = cleanPath.match(/^dealer_(\d+)\//);
    if (match) {
      const pathDealerId = Number(match[1]);
      if (pathDealerId !== dId) {
        return {
          authorized: false,
          status: 403,
          error: "Forbidden: Dealer cannot access other dealers' files.",
        };
      }
      return { authorized: true, status: 200 };
    }

    // Check database ownership in customer_billing table
    const billRows = await sql`
      SELECT customer_billing_customer_id 
      FROM public.customer_billing 
      WHERE customer_billing_file_path = ${filePath} 
         OR customer_billing_file_path LIKE ${`%${cleanPath}%`}
      LIMIT 1;
    `;

    if (billRows.length > 0) {
      const ownerId = Number(billRows[0].customer_billing_customer_id);
      if (ownerId !== dId) {
        return {
          authorized: false,
          status: 403,
          error: "Forbidden: Dealer cannot access other dealers' files.",
        };
      }
      return { authorized: true, status: 200 };
    }

    // Legacy disk upload ownership check
    if (filePath.includes(`/uploads/${dId}/`)) {
      return { authorized: true, status: 200 };
    }

    return {
      authorized: false,
      status: 403,
      error: "Forbidden: Dealer cannot access other dealers' files.",
    };
  }

  return {
    authorized: false,
    status: 403,
    error: "Forbidden: Unauthorized role.",
  };
}

/**
 * POST /api/storage/signed-url
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path: filePath, expiresIn = 1800, download } = body;

    const authResult = await authorizeFileAccess(filePath);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const cleanPath = extractCleanStoragePath(filePath);

    // Call Supabase createSignedUrl
    const options = download ? { download: typeof download === "string" ? download : true } : undefined;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(cleanPath, Math.min(expiresIn, 3600), options);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message || "Failed to create signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      expiresIn,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error generating signed URL";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/storage/signed-url?path=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");
    const expiresIn = parseInt(searchParams.get("expiresIn") || "1800", 10);
    const download = searchParams.get("download");

    if (!filePath) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    const authResult = await authorizeFileAccess(filePath);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const cleanPath = extractCleanStoragePath(filePath);

    const options = download ? { download: download === "true" ? true : download } : undefined;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(cleanPath, Math.min(expiresIn, 3600), options);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message || "Failed to create signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      expiresIn,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
