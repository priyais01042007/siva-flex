import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import { extractCleanStoragePath } from "@/app/api/storage/signed-url/route";
import { clearThumbnailCache } from "./thumbnail/route";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import fs from "fs";
import path from "path";


function resolveDimensions(widthVal: string | number, heightVal: string | number, fileName: string) {
  let w = parseFloat(String(widthVal)) || 0;
  let h = parseFloat(String(heightVal)) || 0;

  if (w <= 0 || h <= 0) {
    const match = (fileName || "").match(/(\d+(?:\.\d+)?)\s*(?:x|\*|\s-\s)\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      w = parseFloat(match[1]) || 0;
      h = parseFloat(match[2]) || 0;
    }
  }

  const area = (w * h).toFixed(2);
  return {
    width: w > 0 ? w.toFixed(1) : "0.0",
    height: h > 0 ? h.toFixed(1) : "0.0",
    area,
  };
}

function resolveTimestampStatus(regTime: string, printTime: string, finishTime: string, deliverTime: string, dbStatus: number) {
  const isSet = (t: string) => Boolean(t && t.trim() !== "" && !t.startsWith("0000"));

  if (isSet(deliverTime) || dbStatus === 4) {
    return { code: 4, label: "Delivered", isDelivered: true };
  }
  if (isSet(finishTime) || dbStatus === 3) {
    return { code: 3, label: "Finished", isDelivered: false };
  }
  if (isSet(printTime) || dbStatus === 2) {
    return { code: 2, label: "Printing", isDelivered: false };
  }
  return { code: 1, label: "Pending", isDelivered: false };
}

// GET: Retrieve only active live production print files
// Strictly joins valid customers (customer_id > 0), discards customer payments (credit_amount > 0),
// and excludes delivered files (status = 4 or delivered_time set)
export async function GET() {
  try {
    const rows = await sql`
      SELECT 
        b.customer_billing_id,
        b.customer_billing_customer_id,
        c.customer_name,
        c.customer_address,
        c.customer_mobile_number,
        c.customer_mail_id,
        c.customer_gst_number,
        b.customer_billing_file_register_time,
        b.customer_billing_file_printing_time,
        b.customer_billing_file_finished_time,
        b.customer_billing_file_delivered_time,
        b.customer_billing_file_type,
        COALESCE(f.flux_type, 'Normal Flex') AS flux_type,
        b.customer_billing_file_name,
        b.customer_billing_file_path,
        b.customer_billing_file_download_path,
        b.customer_billing_file_width,
        b.customer_billing_file_height,
        b.customer_billing_file_area,
        b.customer_billing_flex_amount,
        b.customer_billing_file_quantity,
        b.customer_billing_flex_file_total_amount,
        b.customer_billing_file_status
      FROM public.customer_billing b
      INNER JOIN public.customer c ON c.customer_id = b.customer_billing_customer_id
      LEFT JOIN public.flux f ON f.flux_id = b.customer_billing_file_type
      WHERE b.customer_billing_customer_id > 0
        AND b.customer_billing_file_name IS NOT NULL
        AND b.customer_billing_file_name != ''
        AND (b.customer_billing_credit_amount IS NULL OR b.customer_billing_credit_amount = 0)
        AND b.customer_billing_file_status NOT IN (0, 4)
        AND (b.customer_billing_file_delivered_time IS NULL 
             OR b.customer_billing_file_delivered_time = '' 
             OR b.customer_billing_file_delivered_time = '0000-00-00 00:00:00'
             OR b.customer_billing_file_delivered_time LIKE '0000%')
        AND (b.customer_billing_file_status = 1 
             OR b.customer_billing_flex_file_total_amount > 0 
             OR b.customer_billing_file_width > 0 
             OR b.customer_billing_file_register_time >= '2026-09-01')
      ORDER BY b.customer_billing_id DESC;
    `;

    const mapped = rows.map((r) => {
      const dims = resolveDimensions(
        r.customer_billing_file_width,
        r.customer_billing_file_height,
        r.customer_billing_file_name
      );
      const st = resolveTimestampStatus(
        r.customer_billing_file_register_time,
        r.customer_billing_file_printing_time,
        r.customer_billing_file_finished_time,
        r.customer_billing_file_delivered_time,
        r.customer_billing_file_status
      );

      return {
        customer_billing_id: r.customer_billing_id,
        customer_billing_customer_id: r.customer_billing_customer_id,
        customer_name: r.customer_name,
        customer_address: r.customer_address || "",
        customer_mobile_number: r.customer_mobile_number || "",
        customer_mail_id: r.customer_mail_id || "",
        customer_gst_number: r.customer_gst_number || "",
        customer_billing_file_register_time: r.customer_billing_file_register_time,
        customer_billing_file_type: r.customer_billing_file_type,
        flux_type: r.flux_type,
        customer_billing_file_name: r.customer_billing_file_name,
        customer_billing_file_path: r.customer_billing_file_path,
        customer_billing_file_download_path: r.customer_billing_file_download_path,
        customer_billing_file_width: dims.width,
        customer_billing_file_height: dims.height,
        customer_billing_file_area: dims.area,
        customer_billing_flex_amount: r.customer_billing_flex_amount,
        customer_billing_file_quantity: r.customer_billing_file_quantity,
        customer_billing_flex_file_total_amount: r.customer_billing_flex_file_total_amount,
        customer_billing_file_status: st.code,
        status_label: st.label,
      };
    });

    return NextResponse.json({ success: true, data: mapped });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching live files data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT: Update file status or manual dimensions
export async function PUT(req: Request) {
  try {
    const { id, status, width, height, flexAmount } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required." },
        { status: 400 }
      );
    }

    // Format timestamp in local Indian Standard Time (IST)
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const nowStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    // Handle dimension updates if provided
    if (width !== undefined && height !== undefined) {
      const w = parseFloat(String(width)) || 0;
      const h = parseFloat(String(height)) || 0;
      const area = Number((w * h).toFixed(2));
      const rate = parseFloat(String(flexAmount)) || 0;
      const total = Number((area * rate).toFixed(2));

      await sql`
        UPDATE public.customer_billing
        SET customer_billing_file_width = ${w},
            customer_billing_file_height = ${h},
            customer_billing_file_area = ${area},
            customer_billing_flex_amount = ${rate},
            customer_billing_flex_file_total_amount = ${total}
        WHERE customer_billing_id = ${id};
      `;
    }

    // Handle status updates if provided
    if (status !== undefined) {
      if (Number(status) === 2) {
        // Mark as Printing
        await sql`
          UPDATE public.customer_billing
          SET customer_billing_file_status = 2,
              customer_billing_file_printing_time = ${nowStr}
          WHERE customer_billing_id = ${id};
        `;
      } else if (Number(status) === 4) {
        // Fetch file path before marking delivered so we can delete the disk file
        const fileRows = await sql`
          SELECT customer_billing_file_path 
          FROM public.customer_billing 
          WHERE customer_billing_id = ${id}
          LIMIT 1;
        `;

        // Mark as Delivered
        await sql`
          UPDATE public.customer_billing
          SET customer_billing_file_status = 4,
              customer_billing_file_delivered_time = ${nowStr}
          WHERE customer_billing_id = ${id};
        `;

        // Delete physical file and thumbnail from Supabase Storage and local disk immediately
        if (fileRows.length > 0 && fileRows[0].customer_billing_file_path) {
          const filePathStr = String(fileRows[0].customer_billing_file_path);
          const cleanKey = extractCleanStoragePath(filePathStr);
          
          // 1. Delete ORIGINAL photo immediately from Supabase Storage
          // The lightweight thumbnail is preserved so dealer can see what file was delivered for up to 5 days!
          if (cleanKey && (cleanKey.startsWith("dealer_") || filePathStr.includes("customer-files"))) {
            try {
              await supabase.storage.from(STORAGE_BUCKET).remove([cleanKey]);
              console.log("[Delivery] Immediately deleted original photo from Supabase Storage:", cleanKey);
            } catch (supaDelErr) {
              console.warn("Could not delete original file from Supabase Storage:", supaDelErr);
            }
          }

          // 2. Delete from local .thumbs cache
          if (cleanKey) {
            try {
              const safeCacheName = cleanKey.replace(/[/\\:]/g, "_") + "_thumb.jpg";
              const cachedThumbPath = path.join(process.cwd(), "public", "uploads", ".thumbs", safeCacheName);
              if (fs.existsSync(cachedThumbPath)) {
                fs.unlinkSync(cachedThumbPath);
              }
            } catch (thumbErr) {
              console.warn("Could not delete cached thumb:", thumbErr);
            }
          }

          // 3. Delete from local disk if stored locally
          try {
            const rel = filePathStr.replace(/^\//, "");
            const diskPath = path.join(process.cwd(), "public", rel);
            if (fs.existsSync(diskPath)) {
              fs.unlinkSync(diskPath);
            }
            const ext = path.extname(diskPath);
            const thumbPath = diskPath.slice(0, diskPath.length - ext.length) + "_thumb.jpg";
            if (fs.existsSync(thumbPath)) {
              fs.unlinkSync(thumbPath);
            }
          } catch (delErr) {
            console.warn("Could not delete delivered artwork file from disk:", delErr);
          }
        }
      } else {
        await sql`
          UPDATE public.customer_billing
          SET customer_billing_file_status = ${Number(status)}
          WHERE customer_billing_id = ${id};
        `;
      }
    }

    // Audit log order status update
    try {
      const admin = await getCurrentUser();
      if (status !== undefined) {
        await logAudit({
          userId: admin?.id,
          action: "ORDER_STATUS_CHANGE",
          description: `Order #${id} status changed to ${status === 2 ? "PRINTING (2)" : status === 4 ? "DELIVERED (4)" : status}`,
          req,
        });
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Job details updated successfully.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error updating job details";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


// DELETE: Cancel / Delete file job (status = 0) and purge physical files
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required." },
        { status: 400 }
      );
    }

    const fileRows = await sql`
      SELECT customer_billing_file_path 
      FROM public.customer_billing 
      WHERE customer_billing_id = ${id}
      LIMIT 1;
    `;

    await sql`
      UPDATE public.customer_billing
      SET customer_billing_file_status = 0
      WHERE customer_billing_id = ${id};
    `;

    // Immediately purge physical file from Supabase Storage and disk
    if (fileRows.length > 0 && fileRows[0].customer_billing_file_path) {
      const filePathStr = String(fileRows[0].customer_billing_file_path);
      const cleanKey = extractCleanStoragePath(filePathStr);

      if (cleanKey && (cleanKey.startsWith("dealer_") || filePathStr.includes("customer-files"))) {
        try {
          const ext = path.extname(cleanKey);
          const dir = path.dirname(cleanKey).replace(/\\/g, "/");
          const base = path.basename(cleanKey);
          const thumbKey1 = `${dir}/thumb_${base}`;
          const thumbKey2 = cleanKey.slice(0, cleanKey.length - ext.length) + "_thumb.jpg";
          await supabase.storage.from(STORAGE_BUCKET).remove([cleanKey, thumbKey1, thumbKey2]);
          clearThumbnailCache(cleanKey);
        } catch (e) {
          console.warn("Supabase cancel delete error:", e);
        }
      }

      if (cleanKey) {
        try {
          const safeCacheName = cleanKey.replace(/[/\\:]/g, "_") + "_thumb.jpg";
          const cachedThumbPath = path.join(process.cwd(), "public", "uploads", ".thumbs", safeCacheName);
          if (fs.existsSync(cachedThumbPath)) fs.unlinkSync(cachedThumbPath);
        } catch {}
      }

      try {
        const rel = filePathStr.replace(/^\//, "");
        const diskPath = path.join(process.cwd(), "public", rel);
        if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
        const ext = path.extname(diskPath);
        const thumbPath = diskPath.slice(0, diskPath.length - ext.length) + "_thumb.jpg";
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      } catch {}
    }

    try {
      const admin = await getCurrentUser();
      await logAudit({
        userId: admin?.id,
        action: "FILE_DELETE",
        description: `Admin cancelled order #${id} and purged artwork files.`,
        req,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "File job cancelled and artwork purged successfully.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error cancelling job";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
