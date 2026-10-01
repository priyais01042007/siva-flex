import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET: Retrieve customer accounting details, invoices, and credit payment history
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const cidStr = searchParams.get("cid");
    if (!cidStr) {
      return NextResponse.json({ error: "Customer ID (cid) is required." }, { status: 400 });
    }

    const cid = parseInt(cidStr, 10);
    if (isNaN(cid) || cid <= 0) {
      return NextResponse.json({ error: "Invalid Customer ID." }, { status: 400 });
    }

    // 1. Customer Info and Aggregated Totals
    const customerRows = await sql`
      SELECT 
        c.customer_id,
        c.customer_name,
        c.customer_address,
        c.customer_mobile_number,
        c.customer_mail_id,
        c.customer_gst_number,
        ROUND(COALESCE(b.total_sales, 0)::numeric, 2) as total_sales,
        ROUND(COALESCE(b.total_credit, 0)::numeric, 2) as total_credit,
        ROUND((COALESCE(b.total_sales, 0) - COALESCE(b.total_credit, 0))::numeric, 2) as balance_amount
      FROM public.customer c
      LEFT JOIN (
        SELECT 
          customer_billing_customer_id,
          SUM(COALESCE(customer_billing_flex_file_total_amount, 0)) as total_sales,
          SUM(COALESCE(customer_billing_credit_amount, 0)) as total_credit
        FROM public.customer_billing
        GROUP BY customer_billing_customer_id
      ) b ON b.customer_billing_customer_id = c.customer_id
      WHERE c.customer_id = ${cid};
    `;

    if (customerRows.length === 0) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const customer = customerRows[0];

    // 2. Invoices (paytype = 1: sales / file print jobs / manual invoices)
    const invoices = await sql`
      SELECT 
        b.customer_billing_id,
        b.customer_billing_file_register_time as date,
        COALESCE(f.flux_type, 'Normal Flex') as flux_type,
        b.customer_billing_file_name as file_name,
        b.customer_billing_file_width as width,
        b.customer_billing_file_height as height,
        b.customer_billing_file_area as area,
        b.customer_billing_invoice_number as invoice_number,
        b.customer_billing_flex_file_total_amount as amount,
        b.customer_billing_file_note as notes
      FROM public.customer_billing b
      LEFT JOIN public.flux f ON f.flux_id = b.customer_billing_file_type
      WHERE b.customer_billing_customer_id = ${cid}
        AND (b.customer_billing_flex_file_total_amount > 0 
             OR (b.customer_billing_file_name IS NOT NULL AND b.customer_billing_file_name != '')
             OR (b.customer_billing_invoice_number IS NOT NULL AND b.customer_billing_invoice_number != ''))
      ORDER BY b.customer_billing_file_register_time DESC, b.customer_billing_id DESC;
    `;

    // 3. Credits (paytype = 2: customer payments / bank / cash / gpay)
    const credits = await sql`
      SELECT 
        b.customer_billing_id,
        b.customer_billing_credit_date as received_date,
        b.customer_billing_credit_date as date,
        b.customer_billing_file_register_time as entry_date,
        b.customer_billing_credit_reference_number as reference_number,
        b.customer_billing_credit_amount as amount,
        b.customer_billing_credit_note as notes
      FROM public.customer_billing b
      WHERE b.customer_billing_customer_id = ${cid}
        AND b.customer_billing_credit_amount > 0
      ORDER BY b.customer_billing_credit_date DESC, b.customer_billing_id DESC;
    `;

    return NextResponse.json({
      success: true,
      customer,
      invoices,
      credits,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching customer payment details";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Add new Invoice Entry (paytype = 1) or Credit Payment Entry (paytype = 2)
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const body = await req.json();
    const { paytype, cid, inumber, sdate, samount, rnumber, cdate, camount, note } = body;

    const customerId = parseInt(String(cid), 10);
    if (isNaN(customerId) || customerId <= 0) {
      return NextResponse.json({ error: "Valid Customer ID (cid) is required." }, { status: 400 });
    }

    const payTypeNum = Number(paytype);
    const nowLocalStr = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" });

    if (payTypeNum === 1) {
      // 1. Invoice Entry
      const salesAmount = parseFloat(String(samount)) || 0;
      if (salesAmount <= 0) {
        return NextResponse.json({ error: "Sales amount must be greater than zero." }, { status: 400 });
      }

      let salesDate = sdate ? sdate.replace("T", " ") : nowLocalStr;
      if (salesDate.length === 10) salesDate += " 00:00:00";
      else if (salesDate.length === 16) salesDate += ":00";

      await sql`
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
          customer_billing_file_printing_time,
          customer_billing_file_finished_time,
          customer_billing_file_delivered_time,
          customer_billing_invoice_number,
          customer_billing_invoice_note,
          customer_billing_credit_date,
          customer_billing_credit_reference_number,
          customer_billing_credit_amount,
          customer_billing_credit_note,
          customer_billing_file_status,
          customer_billing_file_note,
          customer_billing_file_download_path
        ) VALUES (
          ${customerId},
          0,
          '',
          '',
          0.00,
          0.00,
          0.00,
          0.00,
          1.00,
          0.00,
          0.00,
          0.00,
          ${salesAmount},
          ${salesDate},
          '0000-00-00 00:00:00',
          '0000-00-00 00:00:00',
          '0000-00-00 00:00:00',
          ${inumber || ''},
          '',
          '0000-00-00 00:00:00',
          '',
          0.00,
          '',
          4,
          ${note || ''},
          ''
        );
      `;

      return NextResponse.json({
        success: true,
        message: "Customer invoice entry added successfully.",
      });
    } else if (payTypeNum === 2) {
      // 2. Credit Payment Entry
      const creditAmount = parseFloat(String(camount)) || 0;
      if (creditAmount <= 0) {
        return NextResponse.json({ error: "Credit amount must be greater than zero." }, { status: 400 });
      }

      // Received date and time (from user input, preserving both date and time)
      let receivedDateTime = cdate ? cdate.replace("T", " ") : nowLocalStr;
      if (receivedDateTime.length === 10) receivedDateTime += " 00:00:00";
      else if (receivedDateTime.length === 16) receivedDateTime += ":00";

      // Automatically generated system registration timestamp
      const systemEntryTime = nowLocalStr;

      await sql`
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
          customer_billing_file_printing_time,
          customer_billing_file_finished_time,
          customer_billing_file_delivered_time,
          customer_billing_invoice_number,
          customer_billing_invoice_note,
          customer_billing_credit_date,
          customer_billing_credit_reference_number,
          customer_billing_credit_amount,
          customer_billing_credit_note,
          customer_billing_file_status,
          customer_billing_file_note,
          customer_billing_file_download_path
        ) VALUES (
          ${customerId},
          0,
          '',
          '',
          0.00,
          0.00,
          0.00,
          0.00,
          0.00,
          0.00,
          0.00,
          0.00,
          0.00,
          ${systemEntryTime},
          '0000-00-00 00:00:00',
          '0000-00-00 00:00:00',
          '0000-00-00 00:00:00',
          '',
          '',
          ${receivedDateTime},
          ${rnumber || ''},
          ${creditAmount},
          ${note || ''},
          4,
          '',
          ''
        );
      `;

      try {
        const admin = await getCurrentUser();
        await logAudit({
          userId: admin?.id,
          action: "PAYMENT_UPDATE",
          description: `Credit payment recorded for customer #${customerId}: ₹${creditAmount}`,
          req,
        });
      } catch {}

      return NextResponse.json({
        success: true,
        message: "Customer credit entry added successfully.",
      });
    } else {
      return NextResponse.json({ error: "Invalid Entry Type. Must be 1 (Invoice) or 2 (Credit)." }, { status: 400 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error saving customer transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Remove customer transaction entry
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
      DELETE FROM public.customer_billing
      WHERE customer_billing_id = ${id};
    `;

    return NextResponse.json({
      success: true,
      message: "Transaction entry removed successfully.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error deleting transaction";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
