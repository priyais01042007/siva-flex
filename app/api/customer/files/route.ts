import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import { extractCleanStoragePath } from "@/app/api/storage/signed-url/route";
import { clearThumbnailCache } from "@/app/api/admin/live-files/thumbnail/route";
import { getCurrentUser, checkPermission } from "@/lib/auth";
import { apiRateLimiter } from "@/lib/rate-limiter";
import { logAudit } from "@/lib/audit";
import fs from "fs";
import path from "path";

// GET active/in-queue files for a customer
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedCid = searchParams.get("customerId");

    // IDOR Protection: If dealer, strictly force their own dealerId
    let effectiveCid = user.dealerId;
    if (user.role === "admin" && requestedCid) {
      effectiveCid = parseInt(requestedCid, 10);
    } else if (user.role === "dealer" && requestedCid && Number(requestedCid) !== user.dealerId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot access other dealers' files." },
        { status: 403 }
      );
    }

    if (!effectiveCid) {
      return NextResponse.json({ success: false, error: "No dealer ID associated with account." }, { status: 400 });
    }

    const isTestCustomer = effectiveCid === 98 || effectiveCid === 99;

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
        cb.customer_billing_flex_file_total_amount,
        cb.customer_billing_file_register_time,
        cb.customer_billing_file_status,
        cb.customer_billing_file_note
      FROM public.customer_billing cb
      LEFT JOIN public.flux f ON cb.customer_billing_file_type = f.flux_id
      WHERE (
        ${isTestCustomer 
          ? sql`cb.customer_billing_customer_id IN (98, 99)` 
          : sql`cb.customer_billing_customer_id = ${effectiveCid}`}
      )
        AND cb.customer_billing_file_name IS NOT NULL
        AND cb.customer_billing_file_name != ''
        AND cb.customer_billing_file_status NOT IN (0, 4)
        AND (cb.customer_billing_file_delivered_time IS NULL 
             OR cb.customer_billing_file_delivered_time = '' 
             OR cb.customer_billing_file_delivered_time LIKE '0000%')
      ORDER BY cb.customer_billing_id DESC
    `;

    // Strip trailing .000000 from datetime if any
    const formatted = rows.map((r) => ({
      ...r,
      customer_billing_file_register_time: (r.customer_billing_file_register_time || "")
        .replace(/\.000000$/, "")
        .trim(),
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error fetching customer files";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE a pending file
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "File ID is required." },
        { status: 400 }
      );
    }

    // 1. Fetch file record and check ownership
    const fileRows = await sql`
      SELECT customer_billing_id, customer_billing_customer_id, customer_billing_file_name, customer_billing_file_path, customer_billing_file_status
      FROM public.customer_billing
      WHERE customer_billing_id = ${id}
      LIMIT 1;
    `;

    if (fileRows.length === 0) {
      return NextResponse.json({ success: false, error: "File record not found." }, { status: 404 });
    }

    const fileRecord = fileRows[0];

    // IDOR Check: Ensure dealer owns this file
    if (!checkPermission(user, "dealer:delete_file", fileRecord.customer_billing_customer_id)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot delete another dealer's file." },
        { status: 403 }
      );
    }

    // Only allow deleting files that are still pending in queue (status = 1)
    if (fileRecord.customer_billing_file_status !== 1 && user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Cannot delete: File is already in production or printed." },
        { status: 400 }
      );
    }

    // 2. Delete database record
    await sql`
      DELETE FROM public.customer_billing
      WHERE customer_billing_id = ${id};
    `;

    // 3. Purge physical artwork from Supabase Storage and disk
    if (fileRecord.customer_billing_file_path) {
      const filePathStr = String(fileRecord.customer_billing_file_path);
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
          console.warn("Supabase file removal error:", e);
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

    // 4. Audit Log
    await logAudit({
      userId: user.id,
      action: "FILE_DELETION",
      description: `Order #${id} deleted: ${fileRecord.customer_billing_file_name} by ${user.role} (${user.email})`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: "File successfully removed from queue and artwork purged.",
      deletedId: id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error deleting file";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
