import { NextRequest, NextResponse } from "next/server";
import { GET as getReports } from "../reports/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return getReports(request);
}
