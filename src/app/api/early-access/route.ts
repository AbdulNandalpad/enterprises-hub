/**
 * POST /api/early-access
 *
 * Saves a marketing lead (early access request) to Supabase and sends a
 * notification email to the EnterpriseHub team via Resend.
 *
 * Body: { name, email, company, message }
 *
 * Supabase table (run once in your SQL editor):
 * ──────────────────────────────────────────────
 * create table if not exists early_access_requests (
 *   id          uuid primary key default gen_random_uuid(),
 *   name        text not null,
 *   email       text not null,
 *   company     text,
 *   message     text,
 *   created_at  timestamptz not null default now()
 * );
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EarlyAccessBody {
  name: string;
  email: string;
  company?: string;
  message?: string;
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: EarlyAccessBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, email, company, message } = body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 422 });
  }

  const errors: string[] = [];

  // ── 1. Save to Supabase ───────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

      const { error: dbError } = await db
        .from("early_access_requests")
        .insert({ name: name.trim(), email: email.trim(), company: company?.trim() ?? null, message: message?.trim() ?? null });

      if (dbError) {
        console.error("[early-access] Supabase insert error:", dbError.message);
        errors.push("db:" + dbError.message);
      }
    } catch (e) {
      console.error("[early-access] Supabase error:", e);
      errors.push("db:unexpected");
    }
  } else {
    console.warn("[early-access] Supabase env vars not set — skipping DB save");
    // Log submission to console as fallback
    console.log("[early-access] Submission:", { name, email, company, message });
  }

  // ── 2. Send notification email to team ────────────────────────────────────
  const resendKey    = process.env.RESEND_API_KEY;
  const notifyEmail  = process.env.EARLY_ACCESS_NOTIFY_EMAIL ?? "hello@enterprises-hub.de";
  const fromAddress  = process.env.RESEND_FROM_EMAIL ?? "EnterpriseHub <notifications@enterprises-hub.de>";

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: fromAddress,
        to:   [notifyEmail],
        subject: `New Early Access Request — ${company ?? email}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:8px;">
            <div style="background:#0a0906;padding:20px 24px;border-radius:6px 6px 0 0;">
              <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#C8341A;font-family:monospace;">EnterpriseHub</p>
              <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff;">New Early Access Request</h1>
            </div>
            <div style="background:#fff;padding:24px;border-radius:0 0 6px 6px;border:1px solid #e5e7eb;border-top:none;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6b7280;width:100px">Name</td>
                    <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111827;font-weight:500">${name}</td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6b7280">Email</td>
                    <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111827"><a href="mailto:${email}" style="color:#1d4ed8">${email}</a></td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6b7280">Company</td>
                    <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111827">${company ?? "—"}</td></tr>
                <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;vertical-align:top">Message</td>
                    <td style="padding:8px 0;font-size:14px;color:#111827;line-height:1.6">${message ? message.replace(/\n/g, "<br>") : "—"}</td></tr>
              </table>
            </div>
            <p style="font-size:11px;color:#9ca3af;text-align:center;margin:16px 0 0">enterprises-hub.de · Early Access Pipeline</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("[early-access] Resend error:", e);
      errors.push("email:unexpected");
    }
  } else {
    console.warn("[early-access] RESEND_API_KEY not set — skipping notification email");
  }

  // Always return success to the user — internal errors are non-blocking.
  return NextResponse.json({ ok: true, errors: errors.length ? errors : undefined }, { status: 200 });
}
