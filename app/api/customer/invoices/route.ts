import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Authenticate Request via Server Session
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedCid = searchParams.get("customerId");
    const dateParam = searchParams.get("date") || searchParams.get("bid") || "";
    const startDate = searchParams.get("startDate") || searchParams.get("sdate") || "";
    const endDate = searchParams.get("endDate") || searchParams.get("edate") || "";

    // 2. IDOR Protection: If dealer, strictly force their own dealerId
    let effectiveCid = user.dealerId;
    if (user.role === "admin" && requestedCid) {
      effectiveCid = parseInt(requestedCid, 10);
    } else if (user.role === "dealer" && requestedCid && Number(requestedCid) !== user.dealerId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot access invoices of other dealers." },
        { status: 403 }
      );
    }

    if (!effectiveCid) {
      return NextResponse.json({ success: false, error: "No dealer ID found for user." }, { status: 400 });
    }

    const cidNum = effectiveCid;
    const isTestCustomer = cidNum === 98 || cidNum === 99;

    // Fetch customer details
    const custRows = await sql`
      SELECT customer_id, customer_name, customer_address, customer_mobile_number, customer_mail_id, customer_gst_number
      FROM customer
      WHERE ${isTestCustomer ? sql`customer_id IN (98, 99)` : sql`customer_id = ${cidNum}`}
      LIMIT 1;
    `;

    const customer = custRows[0] || {
      customer_id: String(cidNum),
      customer_name: user.name || "Customer",
      customer_address: "Palani",
      customer_mobile_number: user.mobile || "",
      customer_mail_id: user.email || "",
      customer_gst_number: user.gst || "",
    };

    if (dateParam) {
      // Return single date invoice bill details
      const cleanDate = dateParam.slice(0, 10);

      const items = await sql`
        SELECT 
          cb.customer_billing_id,
          cb.customer_billing_customer_id,
          cb.customer_billing_file_type,
          f.flux_type,
          cb.customer_billing_file_name,
          cb.customer_billing_file_width,
          cb.customer_billing_file_height,
          cb.customer_billing_file_area,
          cb.customer_billing_flex_amount,
          cb.customer_billing_file_quantity,
          cb.customer_billing_file_gst,
          cb.customer_billing_file_cgst,
          cb.customer_billing_file_sgst,
          cb.customer_billing_flex_file_total_amount,
          cb.customer_billing_file_register_time,
          cb.customer_billing_file_delivered_time,
          cb.customer_billing_invoice_number,
          cb.customer_billing_invoice_note
        FROM customer_billing cb
        LEFT JOIN flux f ON cb.customer_billing_file_type = f.flux_id
        WHERE (
          ${isTestCustomer ? sql`cb.customer_billing_customer_id IN (98, 99)` : sql`cb.customer_billing_customer_id = ${cidNum}`}
        )
        AND cb.customer_billing_flex_file_total_amount > 0
        AND (
          cb.customer_billing_file_register_time LIKE ${`${cleanDate}%`}
          OR cb.customer_billing_file_delivered_time LIKE ${`${cleanDate}%`}
        )
        ORDER BY cb.customer_billing_id ASC;
      `;

      let maxInvNum = "0";
      for (const it of items) {
        if (it.customer_billing_invoice_number && it.customer_billing_invoice_number.trim()) {
          maxInvNum = it.customer_billing_invoice_number.trim();
          break;
        }
      }

      const formattedItems = items.map((it, idx) => {
        const w = Number(it.customer_billing_file_width || 0);
        const h = Number(it.customer_billing_file_height || 0);
        const area = Number(it.customer_billing_file_area || (w * h) || 0);
        const rate = Number(it.customer_billing_flex_amount || 0);
        const qty = Number(it.customer_billing_file_quantity || 1);
        const total = Number(it.customer_billing_flex_file_total_amount || (area * rate * qty) || 0);
        const gst = Number(it.customer_billing_file_gst || 0);
        const cgst = Number(it.customer_billing_file_cgst || 0);
        const sgst = Number(it.customer_billing_file_sgst || 0);
        const gstAmt = gst > 0 ? (total * gst) / 100 : 0;

        return {
          sno: idx + 1,
          id: String(it.customer_billing_id),
          fileType: it.flux_type || "Normal Flex",
          fileName: it.customer_billing_file_name || "Print Order",
          width: w.toFixed(2),
          height: h.toFixed(2),
          area: area.toFixed(2),
          areaFormula: `${w.toFixed(2)} X ${h.toFixed(2)}=${area.toFixed(2)}`,
          rate: rate.toFixed(2),
          qty: qty.toFixed(2),
          flexAmt: (area * rate * qty).toFixed(2),
          gst: gst.toFixed(2),
          cgst: cgst.toFixed(2),
          sgst: sgst.toFixed(2),
          gstAmt: gstAmt.toFixed(2),
          totalAmt: total.toFixed(2),
        };
      });

      const totalFlexAmt = formattedItems.reduce((acc, it) => acc + Number(it.totalAmt), 0);
      const totalGstAmt = formattedItems.reduce((acc, it) => acc + Number(it.gstAmt), 0);
      const grandTotal = totalFlexAmt;

      return NextResponse.json({
        success: true,
        mode: "detail",
        invoiceNumber: maxInvNum,
        invoiceDate: cleanDate,
        currency: "INR",
        customer: {
          id: String(customer.customer_id),
          name: customer.customer_name || "SIGARAM",
          address: customer.customer_address || "palani",
          phone: `+91${String(customer.customer_mobile_number || "9025011789")}`,
          email: customer.customer_mail_id || "sigaramdesignspln@gmail.com",
          gst: customer.customer_gst_number || "",
        },
        items: formattedItems,
        totalFlexAmt: totalFlexAmt.toFixed(2),
        totalGstAmt: totalGstAmt.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
      });
    }

    // Default mode: List of dates with invoices
    let baseSql = `
      SELECT 
        SUBSTRING(COALESCE(NULLIF(customer_billing_file_register_time, ''), customer_billing_file_delivered_time), 1, 10) as inv_date,
        COUNT(*) as total_files,
        COALESCE(MAX(NULLIF(TRIM(customer_billing_invoice_number), '')), '0') as invoice_number,
        SUM(COALESCE(customer_billing_flex_file_total_amount, 0)) as total_amount
      FROM customer_billing
      WHERE (
        ${isTestCustomer ? `customer_billing_customer_id IN (98, 99)` : `customer_billing_customer_id = ${cidNum}`}
      )
      AND customer_billing_flex_file_total_amount > 0
      AND (customer_billing_file_register_time LIKE '20%' OR customer_billing_file_delivered_time LIKE '20%')
    `;

    const conditions: string[] = [];
    const values: any[] = [];

    if (startDate) {
      conditions.push(`SUBSTRING(COALESCE(NULLIF(customer_billing_file_register_time, ''), customer_billing_file_delivered_time), 1, 10) >= $${values.length + 1}`);
      values.push(startDate.slice(0, 10));
    }
    if (endDate) {
      conditions.push(`SUBSTRING(COALESCE(NULLIF(customer_billing_file_register_time, ''), customer_billing_file_delivered_time), 1, 10) <= $${values.length + 1}`);
      values.push(endDate.slice(0, 10));
    }

    if (conditions.length > 0) {
      baseSql += " AND " + conditions.join(" AND ");
    }

    baseSql += ` GROUP BY inv_date ORDER BY inv_date DESC LIMIT 500`;

    const dateRows = await (sql as any).unsafe(baseSql, values);

    const formattedDates = dateRows.map((r: any) => ({
      date: String(r.inv_date),
      totalFiles: Number(r.total_files || 0),
      invoiceNumber: String(r.invoice_number || "0"),
      totalAmount: Number(r.total_amount || 0).toFixed(2),
    }));

    return NextResponse.json({
      success: true,
      mode: "dates",
      customer: {
        id: String(customer.customer_id),
        name: customer.customer_name || "SIGARAM",
        address: customer.customer_address || "palani",
        phone: String(customer.customer_mobile_number || "9025011789"),
        email: customer.customer_mail_id || "sigaramdesignspln@gmail.com",
      },
      dates: formattedDates,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error fetching invoices";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
