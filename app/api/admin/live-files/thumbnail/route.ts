import { NextRequest, NextResponse } from "next/server";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import { extractCleanStoragePath } from "@/app/api/storage/signed-url/route";
import path from "path";
import sharp from "sharp";

// Pure in-memory thumbnail cache for lightning-fast table view rendering (0ms disk I/O, 0 local files)
const memoryThumbCache = new Map<string, { buffer: Buffer; expires: number }>();

export function clearThumbnailCache(cleanKey: string) {
  const normKey = cleanKey.toLowerCase().replace(/[/\\:]/g, "_");
  for (const k of memoryThumbCache.keys()) {
    if (k.includes(normKey) || normKey.includes(k)) {
      memoryThumbCache.delete(k);
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePathParam = searchParams.get("path");

    if (!filePathParam) {
      return new NextResponse("Missing path parameter", { status: 400 });
    }

    const cleanStorageKey = extractCleanStoragePath(filePathParam);
    const isSupabaseObject =
      cleanStorageKey.startsWith("dealer_") || filePathParam.includes("customer-files");

    // 1. Check in-memory RAM cache first
    const cacheKey = cleanStorageKey.toLowerCase().replace(/[/\\:]/g, "_");
    const cached = memoryThumbCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expires > now) {
      return new NextResponse(new Uint8Array(cached.buffer), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
          "Netlify-CDN-Cache-Control": "no-store",
          "Vary": "Cookie, Accept",
        },
      });
    }

    // 2. Handle Supabase Storage files
    if (isSupabaseObject) {
      const dir = path.dirname(cleanStorageKey).replace(/\\/g, "/");
      const base = path.basename(cleanStorageKey);
      const thumbStoragePath = `${dir}/thumb_${base}`;

      // A. Try fetching pre-generated low-quality thumbnail (<25KB) directly from Supabase Storage
      try {
        const { data: thumbBlob, error: thumbErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(thumbStoragePath);

        if (thumbBlob && !thumbErr) {
          const arrayBuf = await thumbBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          memoryThumbCache.set(cacheKey, { buffer, expires: now + 3600000 }); // cache 1 hr in RAM

          return new NextResponse(new Uint8Array(buffer), {
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "private, no-cache, no-store, must-revalidate",
              "Netlify-CDN-Cache-Control": "no-store",
              "Vary": "Cookie, Accept",
            },
          });
        }
      } catch {
        // Thumbnail not found in bucket, proceed to generate on-the-fly from original
      }

      // B. Download original artwork from Supabase Storage & generate low-quality 300px thumbnail in memory
      try {
        const { data: origBlob, error: origErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(cleanStorageKey);

        if (origBlob && !origErr) {
          const arrayBuf = await origBlob.arrayBuffer();
          const resizedBuffer = await sharp(Buffer.from(arrayBuf))
            .resize({ width: 300, height: 300, fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 65 })
            .toBuffer();

          memoryThumbCache.set(cacheKey, { buffer: resizedBuffer, expires: now + 3600000 });

          // Also asynchronously save to Supabase Storage so subsequent requests don't need to resize
          supabase.storage
            .from(STORAGE_BUCKET)
            .upload(thumbStoragePath, resizedBuffer, {
              contentType: "image/jpeg",
              upsert: true,
            })
            .catch(() => {});

          return new NextResponse(new Uint8Array(resizedBuffer), {
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "private, no-cache, no-store, must-revalidate",
              "Netlify-CDN-Cache-Control": "no-store",
              "Vary": "Cookie, Accept",
            },
          });
        }
      } catch (sharpErr) {
        console.warn("Failed to generate sharp thumbnail from Supabase object:", sharpErr);
      }

      // C. Fallback: redirect to Supabase signed URL
      const { data: signData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(cleanStorageKey, 3600);

      if (signData?.signedUrl) {
        return NextResponse.redirect(signData.signedUrl);
      }
    }

    // 3. Remote direct URLs
    if (filePathParam.startsWith("http://") || filePathParam.startsWith("https://")) {
      return NextResponse.redirect(filePathParam);
    }

    return new NextResponse("File not found in storage", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Netlify-CDN-Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Thumbnail error:", error);
    return new NextResponse("Error generating thumbnail", { status: 500 });
  }
}
