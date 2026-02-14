// src/app/api/hubspot/health/route.ts
import { NextResponse } from "next/server";
import { hubspotHealthCheck } from "@/server/hubspot/health";

export const runtime = "nodejs"; // HubSpot fetch is fine on Node runtime
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await hubspotHealthCheck();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
