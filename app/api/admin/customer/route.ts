import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET: Retrieve all active customers with aggregated sales, credit, and balance (Passwords masked)
export async function GET() {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const rows = await sql`
      SELECT 
        c.customer_id, 
        c.customer_name,
        c.customer_address,
        c.customer_mobile_number,
        c.customer_mail_id,
        c.customer_gst_number,
        '••••••••' AS customer_password,
        c.customer_status,
        c.customer_datetime,
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
      WHERE c.customer_status = 1
      ORDER BY c.customer_id ASC;
    `;

    return NextResponse.json({ success: true, data: rows });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching customer data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Add new customer
export async function POST(req: Request) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const { name, mobile, email, address, gst, password } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Customer Name is required." },
        { status: 400 }
      );
    }

    const maxRow = await sql`SELECT COALESCE(MAX(customer_id), 0) + 1 AS next_id FROM public.customer;`;
    const nextId = Number(maxRow[0]?.next_id || 1);
    const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ");
    const cleanEmail = (email || "").trim().toLowerCase();
    const plainPass = (password || "").trim() || "123456";
    const hashed = await hashPassword(plainPass, 10);

    const result = await sql`
      INSERT INTO public.customer (
        customer_id,
        customer_name,
        customer_mail_id,
        customer_mobile_number,
        customer_address,
        customer_gst_number,
        customer_password,
        customer_status,
        customer_datetime
      ) VALUES (
        ${nextId},
        ${name.trim()},
        ${cleanEmail},
        ${Number(mobile) || 0},
        ${(address || "").trim()},
        ${(gst || "").trim()},
        ${"[ENCRYPTED_BCRYPT]"},
        1,
        ${nowStr}
      )
      RETURNING *;
    `;

    // Sync into public.users
    if (cleanEmail) {
      await sql`
        INSERT INTO public.users (email, password_hash, role, dealer_id, status)
        VALUES (${cleanEmail}, ${hashed}, 'dealer', ${nextId}, 'active')
        ON CONFLICT (email) DO UPDATE
        SET password_hash = ${hashed}, dealer_id = ${nextId}, status = 'active';
      `;
    }

    await logAudit({
      userId: admin.id,
      action: "ADMIN_ACTION",
      description: `Admin created dealer: ${name} (ID: ${nextId})`,
      req,
    });

    const safeItem = {
      ...result[0],
      customer_password: "••••••••",
    };

    return NextResponse.json({
      success: true,
      message: "Customer registered successfully.",
      item: safeItem,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error adding customer";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT: Edit existing customer
export async function PUT(req: Request) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const { id, name, mobile, email, address, gst, password } = await req.json();

    if (!id || !name) {
      return NextResponse.json(
        { error: "Customer ID and Name are required." },
        { status: 400 }
      );
    }

    const cleanEmail = (email || "").trim().toLowerCase();

    const result = await sql`
      UPDATE public.customer
      SET 
        customer_name = ${name.trim()},
        customer_mail_id = ${cleanEmail},
        customer_mobile_number = ${Number(mobile) || 0},
        customer_address = ${(address || "").trim()},
        customer_gst_number = ${(gst || "").trim()}
      WHERE customer_id = ${id}
      RETURNING *;
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Customer record not found." },
        { status: 404 }
      );
    }

    // If password provided and changed
    if (password && password.trim() && !password.includes("••••")) {
      const hashed = await hashPassword(password.trim(), 10);
      if (cleanEmail) {
        await sql`
          UPDATE public.users
          SET password_hash = ${hashed}, updated_at = NOW()
          WHERE dealer_id = ${id} OR LOWER(email) = ${cleanEmail};
        `;
        await sql`
          DELETE FROM public.sessions
          WHERE user_id IN (
            SELECT id FROM public.users
            WHERE dealer_id = ${id} OR LOWER(email) = ${cleanEmail}
          );
        `;
      }
    }

    await logAudit({
      userId: admin.id,
      action: "ADMIN_ACTION",
      description: `Admin updated dealer details: ${name} (ID: ${id})`,
      req,
    });

    const safeItem = {
      ...result[0],
      customer_password: "••••••••",
    };

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully.",
      item: safeItem,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error updating customer";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Soft delete customer
export async function DELETE(req: Request) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Customer ID is required." },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE public.customer
      SET customer_status = 0
      WHERE customer_id = ${id}
      RETURNING *;
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Customer record not found." },
        { status: 404 }
      );
    }

    // Suspend in public.users and invalidate active sessions
    await sql`
      UPDATE public.users
      SET status = 'suspended', updated_at = NOW()
      WHERE dealer_id = ${id};
    `;

    await sql`
      DELETE FROM public.sessions
      WHERE user_id IN (SELECT id FROM public.users WHERE dealer_id = ${id});
    `;

    await logAudit({
      userId: admin.id,
      action: "ADMIN_ACTION",
      description: `Admin deactivated dealer ID #${id} and invalidated active sessions.`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Customer removed successfully.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error deleting customer";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
