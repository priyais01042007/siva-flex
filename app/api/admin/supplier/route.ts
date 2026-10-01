import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET: Retrieve all active suppliers with aggregated billing data
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }
    const rows = await sql`
      SELECT 
        s.supplier_id,
        s.supplier_name,
        s.supplier_mail_id,
        s.supplier_mobile_number,
        s.supplier_address,
        s.supplier_gst_number,
        s.supplier_status,
        COALESCE(b.total_purchase, 0)::numeric as total_purchase,
        COALESCE(b.total_debit, 0)::numeric as total_debit,
        (COALESCE(b.total_purchase, 0) - COALESCE(b.total_debit, 0))::numeric as balance_amount
      FROM public.supplier s
      LEFT JOIN (
        SELECT 
          supplier_billing_supplier_id,
          SUM(COALESCE(supplier_billing_invoice_amount, 0)) as total_purchase,
          SUM(COALESCE(supplier_billing_debit_amount, 0)) as total_debit
        FROM public.supplier_billing
        GROUP BY supplier_billing_supplier_id
      ) b ON b.supplier_billing_supplier_id::text = s.supplier_id::text
      WHERE s.supplier_status = 1
      ORDER BY s.supplier_id ASC;
    `;
    return NextResponse.json({ success: true, data: rows });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching supplier data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Add new supplier
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const { name, email, mobile, address, gst } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Supplier Name is required." },
        { status: 400 }
      );
    }

    // Safely generate next supplier_id
    const maxRow = await sql`SELECT COALESCE(MAX(supplier_id), 0) + 1 AS next_id FROM public.supplier;`;
    const nextId = Number(maxRow[0]?.next_id || 1);
    const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ");

    const result = await sql`
      INSERT INTO public.supplier (
        supplier_id,
        supplier_name,
        supplier_mail_id,
        supplier_mobile_number,
        supplier_address,
        supplier_gst_number,
        supplier_status,
        supplier_datetime
      ) VALUES (
        ${nextId},
        ${name.trim()},
        ${(email || "").trim()},
        ${(mobile || "").trim()},
        ${(address || "").trim()},
        ${(gst || "").trim()},
        1,
        ${nowStr}
      )
      RETURNING *;
    `;

    return NextResponse.json({
      success: true,
      message: "Supplier added successfully.",
      item: result[0],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error adding supplier";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT: Edit existing supplier
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const { id, name, email, mobile, address, gst } = await req.json();

    if (!id || !name) {
      return NextResponse.json(
        { error: "Supplier ID and Name are required." },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE public.supplier
      SET 
        supplier_name = ${name.trim()},
        supplier_mail_id = ${(email || "").trim()},
        supplier_mobile_number = ${(mobile || "").trim()},
        supplier_address = ${(address || "").trim()},
        supplier_gst_number = ${(gst || "").trim()}
      WHERE supplier_id = ${id}
      RETURNING *;
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Supplier record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Supplier updated successfully.",
      item: result[0],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error updating supplier";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Delete supplier
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Supplier ID is required for deletion." },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE public.supplier
      SET supplier_status = 0
      WHERE supplier_id = ${id}
      RETURNING *;
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Supplier record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Supplier deleted successfully.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error deleting supplier";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
