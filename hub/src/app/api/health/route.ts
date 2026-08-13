import { NextResponse } from "next/server";
import { envConfigured } from "@/core/env";

export function GET() {
  // Generic status only — no config details leak (security rule 7).
  return NextResponse.json({
    ok: true,
    version: "2.0.0",
    auth: envConfigured("AZURE_AD_CLIENT_ID") ? "configured" : "unconfigured",
    controlPlane: envConfigured("DATABASE_URL") ? "configured" : "unconfigured",
  });
}
