import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please sign in." },
        { status: 401 }
      );
    }

    const effectiveDealerId = user.role === "dealer" ? Number(user.dealerId) : 99;
    const body = await req.json();
    const { orderId, storagePath } = body;

    if (!orderId || !storagePath) {
      return NextResponse.json(
        { success: false, error: "orderId and storagePath are required." },
        { status: 400 }
      );
    }

    // Verify order ownership and finalize path
    const updated = await sql`
      UPDATE public.customer_billing
      SET customer_billing_file_path = ${storagePath}
      WHERE customer_billing_id = ${orderId} 
        AND customer_billing_customer_id = ${effectiveDealerId}
      RETURNING *;
    `;

    if (updated.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order not found or unauthorized." },
        { status: 404 }
      );
    }

    await logAudit({
      userId: user.id,
      action: "FILE_UPLOAD_COMPLETE",
      description: `Order #${orderId} upload finalized: ${storagePath} by dealer #${effectiveDealerId}`,
      req,
    });

    return NextResponse.json({
      success: true,
      message: "File upload finalized successfully!",
      data: updated[0],
    });
  } catch (error: unknown) {
    console.error("[COMPLETE UPLOAD ERROR]:", error);
    const message = error instanceof Error ? error.message : "Error finalizing upload";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
