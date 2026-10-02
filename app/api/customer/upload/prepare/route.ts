import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { uploadRateLimiter } from "@/lib/rate-limiter";
import { validateAndSanitizeFile } from "@/lib/security";

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
  try {
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

    // Rate Limiting
    const rateCheck = uploadRateLimiter.check(String(effectiveDealerId));
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Upload rate limit reached. Please wait ${rateCheck.resetInSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { filename, fileType, fileSize, fluxtype, dimensionUnit = "feet", note = "" } = body;

    if (!fluxtype || fluxtype === "" || fluxtype === "Select Flux") {
      return NextResponse.json(
        { success: false, error: "Please select a Flex Media Type." },
        { status: 400 }
      );
    }

    if (!filename) {
      return NextResponse.json(
        { success: false, error: "Filename is required." },
        { status: 400 }
      );
    }

    // Strict file validation
    const validation = validateAndSanitizeFile(filename, fileType || "image/jpeg", fileSize || 1);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Lookup flux rate
    const fluxRows = await sql`
      SELECT flux_id, flux_type, flux_amount 
      FROM public.flux 
      WHERE flux_id = ${fluxtype}
      LIMIT 1;
    `;
    const fluxRate = fluxRows.length > 0 ? Number(fluxRows[0].flux_amount) || 0 : 0;
    const fluxName = fluxRows.length > 0 ? fluxRows[0].flux_type : "Flex Media";

    const originalName = filename.slice(0, 150);
    const safeFilename = validation.cleanFilename!;
    const dims = parseDimensionsFromFilename(originalName, dimensionUnit as "inch" | "feet");
    const totalAmount = Number((dims.area * fluxRate).toFixed(2));
    const uploadedBy = `dealer_${effectiveDealerId}`;
    const registerTime = getFormattedDateTime();

    // Insert order record
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
        ${note.slice(0, 500)},
        ${uploadedBy}
      )
      RETURNING customer_billing_id;
    `;

    const orderId = result[0].customer_billing_id;
    const storagePath = `dealer_${effectiveDealerId}/order_${orderId}/${safeFilename}`;

    return NextResponse.json({
      success: true,
      orderId,
      storagePath,
      safeFilename,
      dims,
      fluxRate,
      fluxName,
      totalAmount,
      registerTime,
    });
  } catch (error: unknown) {
    console.error("[PREPARE UPLOAD ERROR]:", error);
    const message = error instanceof Error ? error.message : "Error preparing upload";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
