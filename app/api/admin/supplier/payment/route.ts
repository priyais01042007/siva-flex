import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET: Retrieve supplier accounting details, purchase invoices, and debit payments
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const sidStr = searchParams.get("sid");
    if (!sidStr) {
      return NextResponse.json({ error: "Supplier ID (sid) is required." }, { status: 400 });
    }

    const sid = parseInt(sidStr, 10);
    if (isNaN(sid) || sid <= 0) {
      return NextResponse.json({ error: "Invalid Supplier ID." }, { status: 400 });
    }

    // 1. Supplier Info and Aggregated Totals
    const supplierRows = await sql`
      SELECT 
        s.supplier_id,
        s.supplier_name,
        s.supplier_address,
        s.supplier_mobile_number,
        s.supplier_mail_id,
        s.supplier_gst_number,
        ROUND(COALESCE(b.total_purchase, 0)::numeric, 2) as total_purchase,
        ROUND(COALESCE(b.total_debit, 0)::numeric, 2) as total_debit,
        ROUND((COALESCE(b.total_purchase, 0) - COALESCE(b.total_debit, 0))::numeric, 2) as balance_amount
      FROM public.supplier s
      LEFT JOIN (
        SELECT 
          supplier_billing_supplier_id,
          SUM(COALESCE(supplier_billing_invoice_amount, 0)) as total_purchase,
          SUM(COALESCE(supplier_billing_debit_amount, 0)) as total_debit
        FROM public.supplier_billing
        GROUP BY supplier_billing_supplier_id
      ) b ON b.supplier_billing_supplier_id = s.supplier_id
      WHERE s.supplier_id = ${sid};
    `;

    if (supplierRows.length === 0) {
      return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
    }

    const supplier = supplierRows[0];

    // 2. Purchases (paytype = 1: supplier raw material purchases / stock invoices)
    const purchases = await sql`
      SELECT 
        b.supplier_billing_id,
        b.supplier_billing_invoice_date as invoice_date,
        b.supplier_billing_invoice_entry_datetime as entry_date,
        b.supplier_billing_invoice_number as invoice_number,
        b.supplier_billing_invoice_amount as amount,
        b.supplier_billing_invoice_note as notes
      FROM public.supplier_billing b
      WHERE b.supplier_billing_supplier_id = ${sid}
        AND (b.supplier_billing_invoice_amount > 0 
             OR (b.supplier_billing_invoice_number IS NOT NULL AND b.supplier_billing_invoice_number != ''))
      ORDER BY b.supplier_billing_invoice_date DESC, b.supplier_billing_id DESC;
    `;

    // 3. Debits (paytype = 2: payments paid to the supplier)
    const debits = await sql`
      SELECT 
        b.supplier_billing_id,
        b.supplier_billing_debit_date as debit_date,
        b.supplier_billing_debit_entry_datetime as entry_date,
        b.supplier_billing_debit_reference_number as reference_number,
        b.supplier_billing_debit_amount as amount,
        b.supplier_billing_debit_note as notes
      FROM public.supplier_billing b
      WHERE b.supplier_billing_supplier_id = ${sid}
        AND b.supplier_billing_debit_amount > 0
      ORDER BY b.supplier_billing_debit_date DESC, b.supplier_billing_id DESC;
    `;

    return NextResponse.json({
      success: true,
      supplier,
      purchases,
      debits,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching supplier payment details";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Add new Supplier Purchase (paytype = 1) or Debit Payment (paytype = 2)
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const body = await req.json();
    const { paytype, sid, inumber, pdate, pamount, rnumber, ddate, damount, note } = body;

    const supplierId = parseInt(String(sid), 10);
    if (isNaN(supplierId) || supplierId <= 0) {
      return NextResponse.json({ error: "Valid Supplier ID (sid) is required." }, { status: 400 });
    }

    const payTypeNum = Number(paytype);
    const nowLocalStr = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" });

    if (payTypeNum === 1) {
      // 1. Supplier Purchase Entry
      const purchaseAmount = parseFloat(String(pamount)) || 0;
      if (purchaseAmount <= 0) {
        return NextResponse.json({ error: "Purchase amount must be greater than zero." }, { status: 400 });
      }

      let purchaseDate = pdate ? pdate.replace("T", " ") : nowLocalStr;
      if (purchaseDate.length === 10) purchaseDate += " 00:00:00";
      else if (purchaseDate.length === 16) purchaseDate += ":00";

      const systemEntryTime = nowLocalStr;

      await sql`
        INSERT INTO public.supplier_billing (
          supplier_billing_supplier_id,
          supplier_billing_invoice_date,
          supplier_billing_invoice_amount,
          supplier_billing_invoice_note,
          supplier_billing_invoice_status,
          supplier_billing_debit_amount,
          supplier_billing_debit_reference_number,
          supplier_billing_debit_date,
          supplier_billing_debit_status,
          supplier_billing_invoice_number,
          supplier_billing_invoice_entry_datetime,
          supplier_billing_debit_note,
          supplier_billing_debit_entry_datetime
        ) VALUES (
          ${supplierId},
          ${purchaseDate},
          ${purchaseAmount},
          ${note || ''},
          1,
          0.00,
          '',
          '0000-00-00',
          0,
          ${inumber || ''},
          ${systemEntryTime},
          '',
          '0000-00-00 00:00:00'
        );
      `;

      return NextResponse.json({
        success: true,
        message: "Supplier purchase entry recorded successfully.",
      });
    } else if (payTypeNum === 2) {
      // 2. Supplier Debit Payment Entry
      const debitAmount = parseFloat(String(damount)) || 0;
      if (debitAmount <= 0) {
        return NextResponse.json({ error: "Debit amount must be greater than zero." }, { status: 400 });
      }

      let debitDate = ddate ? ddate.replace("T", " ") : nowLocalStr;
      if (debitDate.length === 10) debitDate += " 00:00:00";
      else if (debitDate.length === 16) debitDate += ":00";

      const systemEntryTime = nowLocalStr;

      await sql`
        INSERT INTO public.supplier_billing (
          supplier_billing_supplier_id,
          supplier_billing_invoice_date,
          supplier_billing_invoice_amount,
          supplier_billing_invoice_note,
          supplier_billing_invoice_status,
          supplier_billing_debit_amount,
          supplier_billing_debit_reference_number,
          supplier_billing_debit_date,
          supplier_billing_debit_status,
          supplier_billing_invoice_number,
          supplier_billing_invoice_entry_datetime,
          supplier_billing_debit_note,
          supplier_billing_debit_entry_datetime
        ) VALUES (
          ${supplierId},
          '0000-00-00',
          0.00,
          '',
          0,
          ${debitAmount},
          ${rnumber || ''},
          ${debitDate},
          1,
          '',
          '0000-00-00 00:00:00',
          ${note || ''},
          ${systemEntryTime}
        );
      `;

      return NextResponse.json({
        success: true,
        message: "Supplier debit payment entry recorded successfully.",
      });
    } else {
      return NextResponse.json({ error: "Invalid Entry Type. Must be 1 (Purchase) or 2 (Debit)." }, { status: 400 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error saving supplier transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Remove supplier transaction entry
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (!idStr) {
      return NextResponse.json({ error: "Transaction ID is required." }, { status: 400 });
    }

    const id = parseInt(idStr, 10);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid Transaction ID." }, { status: 400 });
    }

    await sql`
      DELETE FROM public.supplier_billing
      WHERE supplier_billing_id = ${id};
    `;

    return NextResponse.json({
      success: true,
      message: "Supplier transaction entry deleted successfully.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error deleting supplier transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
