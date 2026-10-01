import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import { extractCleanStoragePath } from "@/app/api/storage/signed-url/route";
import { clearThumbnailCache } from "@/app/api/admin/live-files/thumbnail/route";
import { getCurrentUser } from "@/lib/auth";
import path from "path";

// Helper: automatically purge thumbnails of delivered files older than 5 days
async function purgeDeliveredThumbnailsOlderThan5Days() {
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const fiveDaysAgoStr = fiveDaysAgo.toISOString().slice(0, 19).replace("T", " ");

    const expiredRows = await sql`
      SELECT customer_billing_id, customer_billing_file_path
      FROM public.customer_billing
      WHERE customer_billing_file_status = 4
        AND customer_billing_file_delivered_time IS NOT NULL
        AND customer_billing_file_delivered_time != ''
        AND customer_billing_file_delivered_time < ${fiveDaysAgoStr}
        AND customer_billing_file_path IS NOT NULL
        AND customer_billing_file_path != ''
        AND customer_billing_file_path NOT LIKE 'purged:%'
      LIMIT 25;
    `;

    for (const r of expiredRows) {
      const filePathStr = String(r.customer_billing_file_path);
      const cleanKey = extractCleanStoragePath(filePathStr);
      if (cleanKey) {
        const dir = path.dirname(cleanKey).replace(/\\/g, "/");
        const base = path.basename(cleanKey);
        const ext = path.extname(cleanKey);
        const thumbKey1 = `${dir}/thumb_${base}`;
        const thumbKey2 = cleanKey.slice(0, cleanKey.length - ext.length) + "_thumb.jpg";

        await supabase.storage.from(STORAGE_BUCKET).remove([cleanKey, thumbKey1, thumbKey2]);
        clearThumbnailCache(cleanKey);
      }

      await sql`
        UPDATE public.customer_billing
        SET customer_billing_file_path = ${`purged:${filePathStr}`}
        WHERE customer_billing_id = ${r.customer_billing_id};
      `;
    }
  } catch (e) {
    console.warn("Could not purge expired thumbnails:", e);
  }
}

export async function GET(req: Request) {
  try {
    // 1. Authenticate Request via Server Session
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedCid = searchParams.get("customerId");

    // 2. IDOR Protection
    let effectiveCid = user.dealerId;
    if (user.role === "admin" && requestedCid) {
      effectiveCid = parseInt(requestedCid, 10);
    } else if (user.role === "dealer" && requestedCid && Number(requestedCid) !== user.dealerId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot access other dealers' delivered records." },
        { status: 403 }
      );
    }

    if (!effectiveCid) {
      return NextResponse.json({ success: false, error: "No dealer ID found for user." }, { status: 400 });
    }

    const isTestCustomer = effectiveCid === 98 || effectiveCid === 99;

    // Asynchronously trigger 5-day thumbnail purge for delivered files
    purgeDeliveredThumbnailsOlderThan5Days().catch(() => {});

    const rows = await sql`
      SELECT 
        cb.customer_billing_id,
        cb.customer_billing_customer_id,
        cb.customer_billing_file_type,
        f.flux_type,
        cb.customer_billing_file_name,
        cb.customer_billing_file_path,
        cb.customer_billing_file_width,
        cb.customer_billing_file_height,
        cb.customer_billing_file_area,
        cb.customer_billing_flex_amount,
        cb.customer_billing_file_quantity,
        cb.customer_billing_file_gst,
        cb.customer_billing_flex_file_total_amount,
        cb.customer_billing_file_register_time,
        cb.customer_billing_file_printing_time,
        cb.customer_billing_file_delivered_time,
        cb.customer_billing_file_status
      FROM public.customer_billing cb
      LEFT JOIN public.flux f ON cb.customer_billing_file_type = f.flux_id
      WHERE (
        ${isTestCustomer 
          ? sql`cb.customer_billing_customer_id IN (98, 99)` 
          : sql`cb.customer_billing_customer_id = ${effectiveCid}`}
      )
        AND cb.customer_billing_file_name IS NOT NULL
        AND cb.customer_billing_file_name != ''
        AND cb.customer_billing_file_status = 4
      ORDER BY cb.customer_billing_id DESC
    `;

    const formatted = rows.map((r) => {
      const isPurged = !r.customer_billing_file_path || r.customer_billing_file_path.startsWith("purged:");
      const cleanTime = (t: any) => {
        if (!t) return "—";
        const s = String(t).replace(/\.000000$/, "").trim();
        if (s === "0000-00-00 00:00:00" || s === "0000-00-00" || !s) return "—";
        return s;
      };

      return {
        ...r,
        customer_billing_file_path: isPurged ? "" : r.customer_billing_file_path,
        customer_billing_file_register_time: cleanTime(r.customer_billing_file_register_time),
        customer_billing_file_printing_time: cleanTime(r.customer_billing_file_printing_time),
        customer_billing_file_delivered_time: cleanTime(r.customer_billing_file_delivered_time),
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error fetching delivered files";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
