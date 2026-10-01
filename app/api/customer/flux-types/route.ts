import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT flux_id, flux_type, flux_amount, flux_width, flux_height, flux_area
      FROM public.flux
      WHERE flux_status = 1
      ORDER BY flux_id ASC
    `;
    return NextResponse.json({ success: true, data: rows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error fetching flux types";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
