/**
 * POST /api/ai-readiness/submit
 *
 * Accepts multipart form data:
 *   name, email, company, industry?, role?, description?
 *   file: PDF | DOCX | PPTX | image
 *
 * Flow:
 *   1. Validate input
 *   2. Store lead in Supabase (ai_readiness_leads)
 *   3. Analyse document with Claude
 *   4. Send HTML report via Resend
 *   5. Return { ok: true }
 *
 * SQL (run once in Supabase):
 *   CREATE TABLE IF NOT EXISTS ai_readiness_leads (
 *     id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     name       text NOT NULL,
 *     email      text NOT NULL,
 *     company    text NOT NULL,
 *     industry   text,
 *     role       text,
 *     file_name  text,
 *     file_type  text,
 *     created_at timestamptz DEFAULT now()
 *   );
 */

export const runtime    = "nodejs";
export const maxDuration = 60; // Vercel Pro: allow up to 60s for Claude analysis

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin }             from "@/lib/supabase/server";
import { analyseDocument }           from "@/lib/ai-readiness/analyse";
import { sendReportEmail }           from "@/lib/ai-readiness/email";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  // ── Parse fields ───────────────────────────────────────────────────────────
  const name        = (formData.get("name")        as string | null)?.trim() ?? "";
  const email       = (formData.get("email")       as string | null)?.trim().toLowerCase() ?? "";
  const company     = (formData.get("company")     as string | null)?.trim() ?? "";
  const industry    = (formData.get("industry")    as string | null)?.trim() || undefined;
  const role        = (formData.get("role")        as string | null)?.trim() || undefined;
  const description = (formData.get("description") as string | null)?.trim() || undefined;
  const file        = formData.get("file") as File | null;

  if (!name || !email || !company) {
    return NextResponse.json({ error: "name, email and company are required" }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Please upload a file" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  // Determine MIME type — trust Content-Type but also sniff by extension
  let mimeType = file.type;
  if (!mimeType || mimeType === "application/octet-stream") {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
      pdf:  "application/pdf",
      doc:  "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ppt:  "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      png:  "image/png",
      jpg:  "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
    };
    mimeType = map[ext] ?? "application/octet-stream";
  }

  if (!ALLOWED_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF, Word, PowerPoint, or image file." },
      { status: 400 }
    );
  }

  // ── Store lead ─────────────────────────────────────────────────────────────
  const { error: dbError } = await supabaseAdmin
    .from("ai_readiness_leads")
    .insert({
      name,
      email,
      company,
      industry:  industry  ?? null,
      role:      role      ?? null,
      file_name: file.name,
      file_type: mimeType,
    });

  if (dbError) {
    console.error("[ai-readiness/submit] Supabase error:", dbError.message);
    // Non-fatal — continue with analysis even if lead storage fails
  }

  // ── Analyse document ───────────────────────────────────────────────────────
  let report;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    report = await analyseDocument(buffer, mimeType, company, industry, description);
  } catch (err) {
    console.error("[ai-readiness/submit] Analysis error:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again or contact support." },
      { status: 502 }
    );
  }

  // ── Send email ─────────────────────────────────────────────────────────────
  try {
    await sendReportEmail(report, { name, email, company, industry, role, description });
  } catch (err) {
    console.error("[ai-readiness/submit] Email error:", err);
    return NextResponse.json(
      { error: "Report generated but email delivery failed. Please contact support." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
