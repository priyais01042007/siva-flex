import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statementType = (searchParams.get("type") || searchParams.get("statement") || "customer_sales").toLowerCase().trim();
    const sdate = searchParams.get("sdate") || searchParams.get("from") || "";
    const edate = searchParams.get("edate") || searchParams.get("to") || "";
    const search = searchParams.get("search") || "";
    const entityId = searchParams.get("id") || "";

    // Normalize statement key
    // 1 -> supplier_purchase
    // 2 -> supplier_debit
    // 3 -> customer_sales
    // 4 -> customer_credit
    let normalized = "customer_sales";
    let statementTitle = "Customer Sales Statement";

    if (statementType.includes("supplier") && (statementType.includes("purchase") || statementType === "1")) {
      normalized = "supplier_purchase";
      statementTitle = "Supplier Purchase Statement";
    } else if (statementType.includes("supplier") && (statementType.includes("debit") || statementType === "2")) {
      normalized = "supplier_debit";
      statementTitle = "Supplier Debit Statement";
    } else if (statementType.includes("customer") && (statementType.includes("credit") || statementType === "4")) {
      normalized = "customer_credit";
      statementTitle = "Customer Credit Statement";
    } else {
      normalized = "customer_sales";
      statementTitle = "Customer Sales Statement";
    }

    let records: any[] = [];
    let totalAmount = 0;

    if (normalized === "customer_sales") {
      // 1. Customer Sales Statement
      let baseSql = `
        SELECT 
          cb.customer_billing_id as id,
          c.customer_id,
          c.customer_name,
          c.customer_address,
          c.customer_mobile_number,
          c.customer_mail_id,
          c.customer_gst_number,
          cb.customer_billing_file_register_time as date,
          COALESCE(NULLIF(TRIM(cb.customer_billing_invoice_number), ''), '0') as number,
          COALESCE(cb.customer_billing_flex_file_total_amount, 0) as amount,
          COALESCE(NULLIF(TRIM(cb.customer_billing_file_note), ''), cb.customer_billing_invoice_note, '') as notes,
          cb.customer_billing_file_name as file_name,
          cb.customer_billing_file_width as width,
          cb.customer_billing_file_height as height,
          cb.customer_billing_file_area as area
        FROM customer_billing cb
        JOIN customer c ON cb.customer_billing_customer_id = c.customer_id
        WHERE cb.customer_billing_flex_file_total_amount > 0
      `;

      const conditions: string[] = [];
      const values: any[] = [];

      if (sdate) {
        conditions.push(`cb.customer_billing_file_register_time >= $${values.length + 1}`);
        values.push(sdate.includes(" ") ? sdate : `${sdate} 00:00:00`);
      }
      if (edate) {
        conditions.push(`cb.customer_billing_file_register_time <= $${values.length + 1}`);
        values.push(edate.includes(" ") ? edate : `${edate} 23:59:59`);
      }
      if (entityId) {
        conditions.push(`cb.customer_billing_customer_id = $${values.length + 1}`);
        values.push(Number(entityId));
      }

      if (conditions.length > 0) {
        baseSql += " AND " + conditions.join(" AND ");
      }

      baseSql += " ORDER BY cb.customer_billing_file_register_time DESC, cb.customer_billing_id DESC LIMIT 10000";

      const rows = await (sql as any).unsafe(baseSql, values);
      records = rows;
    } else if (normalized === "customer_credit") {
      // 2. Customer Credit Statement
      let baseSql = `
        SELECT 
          cb.customer_billing_id as id,
          c.customer_id,
          c.customer_name,
          c.customer_address,
          c.customer_mobile_number,
          c.customer_mail_id,
          c.customer_gst_number,
          cb.customer_billing_credit_date as date,
          COALESCE(cb.customer_billing_credit_reference_number, '') as number,
          COALESCE(cb.customer_billing_credit_amount, 0) as amount,
          COALESCE(cb.customer_billing_credit_note, '') as notes
        FROM customer_billing cb
        JOIN customer c ON cb.customer_billing_customer_id = c.customer_id
        WHERE cb.customer_billing_credit_amount > 0
      `;

      const conditions: string[] = [];
      const values: any[] = [];

      if (sdate) {
        conditions.push(`cb.customer_billing_credit_date >= $${values.length + 1}`);
        values.push(sdate.includes(" ") ? sdate : `${sdate} 00:00:00`);
      }
      if (edate) {
        conditions.push(`cb.customer_billing_credit_date <= $${values.length + 1}`);
        values.push(edate.includes(" ") ? edate : `${edate} 23:59:59`);
      }
      if (entityId) {
        conditions.push(`cb.customer_billing_customer_id = $${values.length + 1}`);
        values.push(Number(entityId));
      }

      if (conditions.length > 0) {
        baseSql += " AND " + conditions.join(" AND ");
      }

      baseSql += " ORDER BY cb.customer_billing_credit_date DESC, cb.customer_billing_id DESC LIMIT 10000";

      const rows = await (sql as any).unsafe(baseSql, values);
      records = rows;
    } else if (normalized === "supplier_purchase") {
      // 3. Supplier Purchase Statement
      let baseSql = `
        SELECT 
          sb.supplier_billing_id as id,
          s.supplier_id,
          s.supplier_name,
          s.supplier_address,
          s.supplier_mobile_number,
          s.supplier_mail_id,
          s.supplier_gst_number,
          sb.supplier_billing_invoice_date as date,
          COALESCE(sb.supplier_billing_invoice_number, '') as number,
          COALESCE(sb.supplier_billing_invoice_amount, 0) as amount,
          COALESCE(sb.supplier_billing_invoice_note, '') as notes
        FROM supplier_billing sb
        JOIN supplier s ON sb.supplier_billing_supplier_id = s.supplier_id
        WHERE sb.supplier_billing_invoice_amount > 0
      `;

      const conditions: string[] = [];
      const values: any[] = [];

      if (sdate) {
        conditions.push(`sb.supplier_billing_invoice_date >= $${values.length + 1}`);
        values.push(sdate.includes(" ") ? sdate : `${sdate} 00:00:00`);
      }
      if (edate) {
        conditions.push(`sb.supplier_billing_invoice_date <= $${values.length + 1}`);
        values.push(edate.includes(" ") ? edate : `${edate} 23:59:59`);
      }
      if (entityId) {
        conditions.push(`sb.supplier_billing_supplier_id = $${values.length + 1}`);
        values.push(Number(entityId));
      }

      if (conditions.length > 0) {
        baseSql += " AND " + conditions.join(" AND ");
      }

      baseSql += " ORDER BY sb.supplier_billing_invoice_date DESC, sb.supplier_billing_id DESC LIMIT 10000";

      const rows = await (sql as any).unsafe(baseSql, values);
      records = rows;
    } else if (normalized === "supplier_debit") {
      // 4. Supplier Debit Statement
      let baseSql = `
        SELECT 
          sb.supplier_billing_id as id,
          s.supplier_id,
          s.supplier_name,
          s.supplier_address,
          s.supplier_mobile_number,
          s.supplier_mail_id,
          s.supplier_gst_number,
          sb.supplier_billing_debit_date as date,
          COALESCE(sb.supplier_billing_debit_reference_number, '') as number,
          COALESCE(sb.supplier_billing_debit_amount, 0) as amount,
          COALESCE(sb.supplier_billing_debit_note, '') as notes
        FROM supplier_billing sb
        JOIN supplier s ON sb.supplier_billing_supplier_id = s.supplier_id
        WHERE sb.supplier_billing_debit_amount > 0
      `;

      const conditions: string[] = [];
      const values: any[] = [];

      if (sdate) {
        conditions.push(`sb.supplier_billing_debit_date >= $${values.length + 1}`);
        values.push(sdate.includes(" ") ? sdate : `${sdate} 00:00:00`);
      }
      if (edate) {
        conditions.push(`sb.supplier_billing_debit_date <= $${values.length + 1}`);
        values.push(edate.includes(" ") ? edate : `${edate} 23:59:59`);
      }
      if (entityId) {
        conditions.push(`sb.supplier_billing_supplier_id = $${values.length + 1}`);
        values.push(Number(entityId));
      }

      if (conditions.length > 0) {
        baseSql += " AND " + conditions.join(" AND ");
      }

      baseSql += " ORDER BY sb.supplier_billing_debit_date DESC, sb.supplier_billing_id DESC LIMIT 10000";

      const rows = await (sql as any).unsafe(baseSql, values);
      records = rows;
    }

    // Format fields
    const formatted = records.map((r: any) => {
      const amt = Number(r.amount || 0);
      totalAmount += amt;

      // Format date: strictly remove any .000000 or fractional seconds
      let dStr = String(r.date || "").trim().replace(/\.\d+$/, "");
      if (dStr && dStr.length === 10) {
        dStr = `${dStr} 00:00:00`;
      }

      return {
        id: String(r.id),
        name: r.customer_name || r.supplier_name || "",
        address: r.customer_address || r.supplier_address || "",
        phone: String(r.customer_mobile_number || r.supplier_mobile_number || ""),
        email: r.customer_mail_id || r.supplier_mail_id || "",
        gst: r.customer_gst_number || r.supplier_gst_number || "",
        date: dStr,
        number: String(r.number ?? ""),
        amount: amt.toFixed(2),
        notes: String(r.notes || "").trim(),
        width: r.width,
        height: r.height,
        area: r.area,
        fileName: r.file_name,
      };
    });

    return NextResponse.json({
      success: true,
      statementType: normalized,
      statementTitle,
      totalCount: formatted.length,
      totalAmount: totalAmount.toFixed(2),
      data: formatted,
    });
  } catch (error: any) {
    console.error("Reports API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
