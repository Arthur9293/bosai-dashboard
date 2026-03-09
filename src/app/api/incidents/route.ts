import { NextResponse } from "next/server";

export async function GET() {
  const incidents = [];

  return NextResponse.json({
    ok: true,
    count: incidents.length,
    data: incidents
  });
}
