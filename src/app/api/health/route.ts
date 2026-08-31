import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    mode: "local-storage",
    database: "not used",
    timestamp: new Date().toISOString(),
  });
}
