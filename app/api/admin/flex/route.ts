import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET: Retrieve all active flex types
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }
    const rows = await sql`
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
    return NextResponse.json({ success: true, data: rows });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching flex data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Add new flex type
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const { flex_type, width, height, area, amount } = await req.json();

    if (!flex_type || amount === undefined) {
      return NextResponse.json(
        { error: "Flex Type and Amount are required." },
        { status: 400 }
      );
    }

    const numWidth = Number(width) || 1.0;
    const numHeight = Number(height) || 1.0;
    const numArea = Number(area) || numWidth * numHeight;
    const numAmount = Number(amount) || 0.0;

    // Safely generate next flux_id
    const maxRow = await sql`SELECT COALESCE(MAX(flux_id), 0) + 1 AS next_id FROM public.flux;`;
    const nextId = Number(maxRow[0]?.next_id || 1);
    const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ");

    const result = await sql`
      INSERT INTO public.flux (
        flux_id,
        flux_type,
        flux_width,
        flux_height,
        flux_area,
        flux_amount,
        flux_status,
        flux_datetime
      ) VALUES (
        ${nextId},
        ${flex_type.trim()},
        ${numWidth},
        ${numHeight},
        ${numArea},
        ${numAmount},
        1,
        ${nowStr}
      )
      RETURNING *;
    `;

    return NextResponse.json({
      success: true,
      message: "Flex media added successfully.",
      item: result[0],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error adding flex media";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT: Edit existing flex type
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrative access required." }, { status: 403 });
    }

    const { id, flex_type, width, height, area, amount } = await req.json();

    if (!id || !flex_type || amount === undefined) {
      return NextResponse.json(
        { error: "Flex ID, Type, and Amount are required." },
        { status: 400 }
      );
    }

    const numWidth = Number(width) || 1.0;
    const numHeight = Number(height) || 1.0;
    const numArea = Number(area) || numWidth * numHeight;
    const numAmount = Number(amount) || 0.0;

    const result = await sql`
      UPDATE public.flux
      SET 
        flux_type = ${flex_type.trim()},
        flux_width = ${numWidth},
        flux_height = ${numHeight},
        flux_area = ${numArea},
        flux_amount = ${numAmount}
      WHERE flux_id = ${id}
      RETURNING *;
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Flex record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Flex media updated successfully.",
      item: result[0],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error updating flex media";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Deactivate / Remove flex type
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
        { error: "Flex ID is required." },
        { status: 400 }
      );
    }

    // Soft delete: set flux_status = 0
    const result = await sql`
      UPDATE public.flux
      SET flux_status = 0
      WHERE flux_id = ${Number(id)}
      RETURNING *;
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Flex record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Flex media removed successfully.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error deleting flex media";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
