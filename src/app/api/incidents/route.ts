import { NextResponse } from "next/server";

export async function GET() {
  const incidents: Array<Record<string, unknown>> = [];

  return NextResponse.json({
    ok: true,
    count: incidents.length,
    data: incidents,
  });
}
