/**
 * GET /api/connectors/sap/data?configId=<uuid>&type=opportunities|accounts|activities|stats
 *
 * Server-side proxy for SAP Sales Cloud (C4C).
 * Loads credentials from connector_configs table — basic auth, no OAuth dance needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { assertSameOrigin, checkRateLimit, getClientIp } from "@/lib/api-security";
import {
  getSAPOpportunities,
  getSAPAccounts,
  getSAPActivities,
  getSAPStats,
} from "@/lib/connectors/sap/client";

export const runtime = "nodejs";

// Validate configId is a well-formed UUID to prevent injection
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  // CSRF guard — must originate from our own app
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  // Rate limit — 30 SAP requests per IP per minute
  const ip = getClientIp(req);
  const rateLimitErr = checkRateLimit(`sap:data:${ip}`, 30, 60_000);
  if (rateLimitErr) return rateLimitErr;

  const configId = req.nextUrl.searchParams.get("configId");
  const type     = req.nextUrl.searchParams.get("type") ?? "opportunities";

  if (!configId || !UUID_RE.test(configId)) {
    return NextResponse.json({ error: "configId required (valid UUID)" }, { status: 400 });
  }

  // Load credentials from DB
  const { data: config, error } = await supabaseAdmin
    .from("connector_configs")
    .select("instance_url, client_id, client_secret")
    .eq("id", configId)
    .in("connector_type", ["sap_sales_cloud", "sap_s4hana"])
    .single();

  if (error || !config) {
    return NextResponse.json({ error: "Connector config not found" }, { status: 404 });
  }

  const { instance_url, client_id: username, client_secret: password } = config;

  try {
    let data: unknown;
    switch (type) {
      case "opportunities": data = await getSAPOpportunities(instance_url, username, password); break;
      case "accounts":      data = await getSAPAccounts(instance_url, username, password);      break;
      case "activities":    data = await getSAPActivities(instance_url, username, password);    break;
      case "stats":         data = await getSAPStats(instance_url, username, password);         break;
      default: return NextResponse.json({ error: "unknown_type" }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = (err as Error).message ?? "SAP API error";
    console.error("[SAP data]", msg);

    if (msg.includes("401")) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
