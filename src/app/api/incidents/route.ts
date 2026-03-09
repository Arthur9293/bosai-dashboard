import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "incidents_route",
    incidents: [],
    ts: new Date().toISOString(),
  });
}
