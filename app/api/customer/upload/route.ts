import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth";
import { uploadRateLimiter } from "@/lib/rate-limiter";
import { validateAndSanitizeFile } from "@/lib/security";
import { extractClientMeta, logAudit } from "@/lib/audit";

function getFormattedDateTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function parseDimensionsFromFilename(
  filename: string,
  unit: "inch" | "feet" = "feet"
): { width: number; height: number; area: number } {
  const match = filename.match(/(\d+(?:\.\d+)?)\s*(?:[*xX]|by)\s*(\d+(?:\.\d+)?)/);
  if (match) {
    const rawW = parseFloat(match[1]) || 0;
    const rawH = parseFloat(match[2]) || 0;
    if (unit === "inch") {
      const width = Number((rawW / 12).toFixed(2));
      const height = Number((rawH / 12).toFixed(2));
      const area = Number((width * height).toFixed(2));
      return { width, height, area };
    } else {
      const width = Number(rawW.toFixed(2));
      const height = Number(rawH.toFixed(2));
      const area = Number((width * height).toFixed(2));
      return { width, height, area };
    }
  }
  return { width: 0, height: 0, area: 0 };
}

export async function POST(req: Request) {
  const meta = extractClientMeta(req);

  try {
    // 1. Authenticate Request via Server Session
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please sign in to upload files." },
        { status: 401 }
      );
    }

    const effectiveDealerId = user.role === "dealer" ? Number(user.dealerId) : 99;
    if (!effectiveDealerId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: No valid dealer profile attached." },
        { status: 403 }
      );
    }

    // 2. Rate Limiting Check (20 uploads per minute per user)
    const rateCheck = uploadRateLimiter.check(String(effectiveDealerId));
    if (!rateCheck.allowed) {
      await logAudit({
        userId: user.id,
        action: "RATE_LIMIT_TRIGGERED",
        description: `File upload rate limit reached for dealer #${effectiveDealerId}.`,
        req,
      });

      return NextResponse.json(
        {
          success: false,
          error: `Upload rate limit reached (20 uploads/minute). Please wait ${rateCheck.resetInSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const fluxtype = formData.get("fluxtype")?.toString();
    const dimensionUnit = (formData.get("dimensionUnit")?.toString() || "feet") as "inch" | "feet";
    const files = formData.getAll("file") as File[];
    const note = (formData.get("note")?.toString() || "").slice(0, 500); // limit note length

    if (!fluxtype || fluxtype === "" || fluxtype === "Select Flux") {
      return NextResponse.json(
        { success: false, error: "Please select a Flex Media Type." },
        { status: 400 }
      );
    }

    if (!files || files.length === 0 || !(files[0] instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Please choose at least one file to upload." },
        { status: 400 }
      );
    }

    // Lookup flux media rate from DB
    const fluxRows = await sql`
      SELECT flux_id, flux_type, flux_amount 
      FROM public.flux 
      WHERE flux_id = ${fluxtype}
      LIMIT 1;
    `;
    const fluxRate = fluxRows.length > 0 ? Number(fluxRows[0].flux_amount) || 0 : 0;

    const insertedFiles = [];
    const registerTime = getFormattedDateTime();

    for (const file of files) {
      if (!file.name) continue;

      // 3. Strict File Security Validation (MIME, Extension, Size <= 10MB, Sanitized Name)
      const validation = validateAndSanitizeFile(file.name, file.type, file.size);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }

      const originalName = file.name.slice(0, 150); // limit stored filename length
      const safeFilename = validation.cleanFilename!;

      // In-memory buffer for original resolution
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate low-res thumbnail in memory for fast rendering
      let thumbBuffer: Buffer | null = null;
      try {
        thumbBuffer = await sharp(buffer)
          .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 65 })
          .toBuffer();
      } catch (thumbErr) {
        console.warn("Thumbnail generation warning:", thumbErr);
      }

      const dims = parseDimensionsFromFilename(originalName, dimensionUnit);
      const totalAmount = Number((dims.area * fluxRate).toFixed(2));
      const uploadedBy = `dealer_${effectiveDealerId}`;

      // 4. Insert billing order record
      const result = await sql`
        INSERT INTO public.customer_billing (
          customer_billing_customer_id,
          customer_billing_file_type,
          customer_billing_file_name,
          customer_billing_file_path,
          customer_billing_file_width,
          customer_billing_file_height,
          customer_billing_file_area,
          customer_billing_flex_amount,
          customer_billing_file_quantity,
          customer_billing_file_gst,
          customer_billing_file_cgst,
          customer_billing_file_sgst,
          customer_billing_flex_file_total_amount,
          customer_billing_file_register_time,
          customer_billing_file_status,
          customer_billing_file_note,
          uploaded_by
        ) VALUES (
          ${effectiveDealerId},
          ${fluxtype},
          ${originalName},
          'pending_upload',
          ${dims.width},
          ${dims.height},
          ${dims.area},
          ${fluxRate},
          1.00,
          0.00,
          0.00,
          0.00,
          ${totalAmount},
          ${registerTime},
          1,
          ${note},
          ${uploadedBy}
        )
        RETURNING customer_billing_id;
      `;

      const orderId = result[0].customer_billing_id;

      // 5. Enforce Private Storage Folder Structure: customer-files/dealer_{dealer_id}/order_{order_id}/{filename}
      const storagePath = `dealer_${effectiveDealerId}/order_${orderId}/${safeFilename}`;
      const thumbStoragePath = `dealer_${effectiveDealerId}/order_${orderId}/thumb_${safeFilename}`;

      // Upload original file to private Supabase Storage
      try {
        const { error: supaErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, buffer, {
            contentType: file.type || "image/jpeg",
            upsert: true,
          });

        if (supaErr) {
          console.warn("Supabase storage upload error:", supaErr.message);
        }
      } catch (err) {
        console.warn("Supabase storage upload exception:", err);
      }

      // Upload thumbnail to private Supabase Storage
      if (thumbBuffer) {
        try {
          await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(thumbStoragePath, thumbBuffer, {
              contentType: "image/jpeg",
              upsert: true,
            });
        } catch (thumbErr) {
          console.warn("Thumbnail upload exception:", thumbErr);
        }
      }

      // Update path in database
      await sql`
        UPDATE public.customer_billing
        SET customer_billing_file_path = ${storagePath}
        WHERE customer_billing_id = ${orderId};
      `;

      // 6. Generate signed URL for immediate preview (no public URLs)
      const { data: signData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 1800);

      const signedUrl = signData?.signedUrl || `/api/storage/file?path=${encodeURIComponent(storagePath)}`;

      // 7. Audit Log
      await logAudit({
        userId: user.id,
        action: "FILE_UPLOAD",
        description: `Order #${orderId} file uploaded: ${originalName} (${(file.size / 1024).toFixed(1)} KB) by dealer #${effectiveDealerId}`,
        req,
      });

      insertedFiles.push({
        id: orderId,
        name: originalName,
        path: storagePath,
        signedUrl: signedUrl,
        dealerId: effectiveDealerId,
        orderId: orderId,
        uploadedBy: uploadedBy,
        width: dims.width,
        height: dims.height,
        area: dims.area,
        flexAmount: fluxRate,
        totalAmount: totalAmount,
        status: 1,
        registerTime: registerTime,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${insertedFiles.length} file(s) uploaded successfully!`,
      data: insertedFiles,
    });
  } catch (error: unknown) {
    console.error("[UPLOAD ERROR]:", error);
    const message = error instanceof Error ? error.message : "Error processing file upload";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
