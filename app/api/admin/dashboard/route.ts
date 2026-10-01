import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }
    // 1. Flex types (only active records, excluding inactive opening balance)
    const fluxRows = await sql`
      SELECT 
        flux_id,
        flux_type,
        flux_width,
        flux_height,
        flux_area,
        flux_amount,
        flux_status
      FROM public.flux
      WHERE flux_status = 1 AND flux_type != 'Openning Balance'
      ORDER BY flux_type ASC;
    `;

    // 2. Suppliers with aggregated billing accountancy
    const supplierRows = await sql`
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

    // 3. Customers
    const customerRows = await sql`
      SELECT 
        customer_id,
        customer_name,
        customer_mail_id,
        customer_mobile_number,
        customer_address,
        customer_gst_number,
        customer_status,
        customer_datetime
      FROM public.customer
      ORDER BY customer_id DESC;
    `;

    // 4. Live Files (Recent 40 print jobs from customer_billing)
    const liveFilesRows = await sql`
      SELECT 
        customer_billing_id,
        customer_billing_customer_id,
        customer_billing_file_name,
        customer_billing_file_type,
        customer_billing_file_width,
        customer_billing_file_height,
        customer_billing_file_area,
        customer_billing_flex_amount,
        customer_billing_file_quantity,
        customer_billing_file_register_time,
        customer_billing_file_finished_time,
        customer_billing_file_delivered_time,
        customer_billing_file_status
      FROM public.customer_billing
      ORDER BY customer_billing_id DESC
      LIMIT 40;
    `;

    // 5. Report summary metrics
    const orderCountRes = await sql`SELECT count(*) as total_orders, sum(customer_billing_flex_amount) as total_revenue FROM public.customer_billing;`;
    const customerCountRes = await sql`SELECT count(*) as total_customers FROM public.customer;`;
    const supplierCountRes = await sql`SELECT count(*) as total_suppliers FROM public.supplier;`;

    return NextResponse.json({
      success: true,
      data: {
        flux: fluxRows,
        suppliers: supplierRows,
        customers: customerRows,
        liveFiles: liveFilesRows,
        report: {
          totalOrders: Number(orderCountRes[0]?.total_orders || 0),
          totalRevenue: Number(orderCountRes[0]?.total_revenue || 0),
          totalCustomers: Number(customerCountRes[0]?.total_customers || 0),
          totalSuppliers: Number(supplierCountRes[0]?.total_suppliers || 0),
          totalFluxTypes: fluxRows.length,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
