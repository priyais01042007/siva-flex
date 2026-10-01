import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { orderTrackingRateLimiter } from "@/lib/rate-limiter";
import { extractClientMeta } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const meta = extractClientMeta(req);
    const rateCheck = orderTrackingRateLimiter.check(meta.ipAddress);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many tracking requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.resetInSeconds),
          },
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        { error: "Order ID or File Name is required." },
        { status: 400 }
      );
    }

    const trimmed = query.trim();
    if (trimmed.length > 80) {
      return NextResponse.json(
        { error: "Search query is too long." },
        { status: 400 }
      );
    }

    const isNumeric = /^\d+$/.test(trimmed);
    if (!isNumeric && trimmed.length < 3) {
      return NextResponse.json(
        { error: "File name search requires at least 3 characters." },
        { status: 400 }
      );
    }

    let rows;
    if (isNumeric) {
      const orderId = parseInt(trimmed, 10);
      rows = await sql`
        SELECT 
          customer_billing_id,
          customer_billing_file_name,
          customer_billing_file_width,
          customer_billing_file_height,
          customer_billing_file_area,
          customer_billing_file_quantity,
          customer_billing_flex_file_total_amount,
          customer_billing_file_status,
          customer_billing_file_register_time,
          customer_billing_file_printing_time,
          customer_billing_file_finished_time,
          customer_billing_file_delivered_time,
          customer_billing_invoice_number
        FROM public.customer_billing
        WHERE customer_billing_id = ${orderId}
        LIMIT 1;
      `;
    } else {
      rows = await sql`
        SELECT 
          customer_billing_id,
          customer_billing_file_name,
          customer_billing_file_width,
          customer_billing_file_height,
          customer_billing_file_area,
          customer_billing_file_quantity,
          customer_billing_flex_file_total_amount,
          customer_billing_file_status,
          customer_billing_file_register_time,
          customer_billing_file_printing_time,
          customer_billing_file_finished_time,
          customer_billing_file_delivered_time,
          customer_billing_invoice_number
        FROM public.customer_billing
        WHERE customer_billing_file_name ILIKE ${'%' + trimmed + '%'}
        ORDER BY customer_billing_id DESC
        LIMIT 1;
      `;
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: `No print order found matching "${trimmed}". Please check the ID.` },
        { status: 404 }
      );
    }

    const o = rows[0];
    
    // Status text mapping
    const statusMap: Record<number, { label: string; step: number; color: string }> = {
      1: { label: "Registered / Pending Print", step: 1, color: "#f59e0b" },
      2: { label: "Printing In Progress", step: 2, color: "#3b82f6" },
      3: { label: "Printing Finished", step: 3, color: "#8b5cf6" },
      4: { label: "Delivered / Ready for Pickup", step: 4, color: "#10b981" },
    };

    const statusInfo = statusMap[o.customer_billing_file_status] || {
      label: "Active Order",
      step: 1,
      color: "#6b7280",
    };

    return NextResponse.json({
      success: true,
      order: {
        id: o.customer_billing_id,
        fileName: o.customer_billing_file_name,
        width: o.customer_billing_file_width,
        height: o.customer_billing_file_height,
        area: o.customer_billing_file_area,
        quantity: o.customer_billing_file_quantity,
        totalAmount: o.customer_billing_flex_file_total_amount,
        status: statusInfo.label,
        statusCode: o.customer_billing_file_status,
        step: statusInfo.step,
        color: statusInfo.color,
        invoiceNumber: o.customer_billing_invoice_number,
        registerTime: o.customer_billing_file_register_time,
        deliveredTime: o.customer_billing_file_delivered_time,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lookup error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
