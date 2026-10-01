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
    const type = (searchParams.get("type") || searchParams.get("statement") || "invoice").toLowerCase().trim();
    const sdate = searchParams.get("sdate") || searchParams.get("startDate") || "";
    const edate = searchParams.get("edate") || searchParams.get("endDate") || "";

    // 2. IDOR Protection: If dealer, strictly force their own dealerId
    let effectiveCid = user.dealerId;
    if (user.role === "admin" && requestedCid) {
      effectiveCid = parseInt(requestedCid, 10);
    } else if (user.role === "dealer" && requestedCid && Number(requestedCid) !== user.dealerId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot access financial statements of other dealers." },
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

    // Calculate customer overall totals (Sales / Invoices & Payments / Debits)
    const salesTotalRes = await sql`
      SELECT COALESCE(SUM(customer_billing_flex_file_total_amount), 0) as total_sales
      FROM customer_billing
      WHERE ${isTestCustomer ? sql`customer_billing_customer_id IN (98, 99)` : sql`customer_billing_customer_id = ${cidNum}`}
        AND customer_billing_flex_file_total_amount > 0;
    `;
    const creditsTotalRes = await sql`
      SELECT COALESCE(SUM(customer_billing_credit_amount), 0) as total_credits
      FROM customer_billing
      WHERE ${isTestCustomer ? sql`customer_billing_customer_id IN (98, 99)` : sql`customer_billing_customer_id = ${cidNum}`}
        AND customer_billing_credit_amount > 0;
    `;

    const totalSales = Number(salesTotalRes[0]?.total_sales || 0);
    const totalPaid = Number(creditsTotalRes[0]?.total_credits || 0);
    const balance = totalSales - totalPaid;

    const isDebit = type.includes("debit") || type === "2";
    let records: any[] = [];

    if (isDebit) {
      // Debit Statement (Customer Payments / Credits)
      let baseSql = `
        SELECT 
          customer_billing_id as id,
          COALESCE(NULLIF(TRIM(customer_billing_credit_date), ''), customer_billing_file_register_time) as date,
          COALESCE(NULLIF(TRIM(customer_billing_credit_reference_number), ''), 'CASH') as number,
          customer_billing_credit_amount as amount,
          COALESCE(NULLIF(TRIM(customer_billing_credit_note), ''), 'PAYMENT') as notes
        FROM customer_billing
        WHERE (
          ${isTestCustomer ? `customer_billing_customer_id IN (98, 99)` : `customer_billing_customer_id = ${cidNum}`}
        )
        AND customer_billing_credit_amount > 0
      `;

      const conditions: string[] = [];
      const values: any[] = [];

      if (sdate) {
        conditions.push(`customer_billing_credit_date >= $${values.length + 1}`);
        values.push(sdate.includes(" ") ? sdate : `${sdate} 00:00:00`);
      }
      if (edate) {
        conditions.push(`customer_billing_credit_date <= $${values.length + 1}`);
        values.push(edate.includes(" ") ? edate : `${edate} 23:59:59`);
      }

      if (conditions.length > 0) {
        baseSql += " AND " + conditions.join(" AND ");
      }

      baseSql += ` ORDER BY customer_billing_credit_date DESC, customer_billing_id DESC LIMIT 10000`;
      records = await (sql as any).unsafe(baseSql, values);
    } else {
      // Invoice Statement (Customer Sales / Orders)
      let baseSql = `
        SELECT 
          customer_billing_id as id,
          customer_billing_file_register_time as date,
          customer_billing_file_name,
          customer_billing_file_width,
          customer_billing_file_height,
          customer_billing_file_area,
          COALESCE(NULLIF(TRIM(customer_billing_invoice_number), ''), '0') as number,
          customer_billing_flex_file_total_amount as amount,
          COALESCE(NULLIF(TRIM(customer_billing_file_note), ''), customer_billing_invoice_note, '') as notes
        FROM customer_billing
        WHERE (
          ${isTestCustomer ? `customer_billing_customer_id IN (98, 99)` : `customer_billing_customer_id = ${cidNum}`}
        )
        AND customer_billing_flex_file_total_amount > 0
      `;

      const conditions: string[] = [];
      const values: any[] = [];

      if (sdate) {
        conditions.push(`customer_billing_file_register_time >= $${values.length + 1}`);
        values.push(sdate.includes(" ") ? sdate : `${sdate} 00:00:00`);
      }
      if (edate) {
        conditions.push(`customer_billing_file_register_time <= $${values.length + 1}`);
        values.push(edate.includes(" ") ? edate : `${edate} 23:59:59`);
      }

      if (conditions.length > 0) {
        baseSql += " AND " + conditions.join(" AND ");
      }

      baseSql += ` ORDER BY customer_billing_file_register_time DESC, customer_billing_id DESC LIMIT 10000`;
      records = await (sql as any).unsafe(baseSql, values);
    }

    const cleanDateTime = (val: string) => {
      if (!val) return "";
      let s = String(val).trim().replace(/\.000000$/, "");
      if (s.length === 10) s = `${s} 00:00:00`;
      return s;
    };

    const formattedRecords = records.map((r: any) => {
      const dateClean = cleanDateTime(r.date);
      if (isDebit) {
        return {
          id: String(r.id),
          date: dateClean,
          number: String(r.number || "CASH"),
          amount: Number(r.amount || 0).toFixed(2),
          notes: String(r.notes || "PAYMENT"),
        };
      } else {
        const w = Number(r.customer_billing_file_width || 0);
        const h = Number(r.customer_billing_file_height || 0);
        const a = Number(r.customer_billing_file_area || 0);
        const fn = r.customer_billing_file_name || "Flex Artwork";
        const dimStr = (w > 0 && h > 0) ? `${w.toFixed(2)}*${h.toFixed(2)}=${a.toFixed(2)}` : "";
        const fileDisplay = dimStr ? `${fn} ${dimStr}` : fn;

        return {
          id: String(r.id),
          date: dateClean,
          fileName: fn,
          file: fileDisplay,
          width: w > 0 ? w.toFixed(2) : "",
          height: h > 0 ? h.toFixed(2) : "",
          area: a > 0 ? a.toFixed(2) : "",
          number: String(r.number || "0"),
          amount: Number(r.amount || 0).toFixed(2),
          notes: String(r.notes || ""),
        };
      }
    });

    return NextResponse.json({
      success: true,
      statementType: isDebit ? "debit" : "invoice",
      statementTitle: isDebit ? "Debit Statement" : "Purchase Statement",
      customer: {
        id: String(customer.customer_id),
        name: customer.customer_name || "SIGARAM",
        address: customer.customer_address || "palani",
        phone: String(customer.customer_mobile_number || "9025011789"),
        email: customer.customer_mail_id || "sigaramdesignspln@gmail.com",
        gst: customer.customer_gst_number || "",
      },
      summary: {
        totalSales,
        totalPaid,
        balance,
      },
      records: formattedRecords,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error generating customer report";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
