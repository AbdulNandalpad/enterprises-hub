/**
 * POST /api/superadmin/upload-logo
 *
 * Accepts a multipart/form-data file upload, stores it in
 * Supabase Storage (bucket: "tenant-logos"), and returns the public URL.
 *
 * Security:
 *  - Protected by superadmin auth (sa-token cookie)
 *  - SVG rejected (stored XSS risk — HIGH-5)
 *  - Max 2 MB
 *  - MIME type checked (browser-supplied; magic-byte check is future improvement)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { assertSuperadmin } from "@/lib/superadmin-auth";

const BUCKET = "tenant-logos";
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

// SVG excluded — SVG files can contain <script> tags and event handlers (HIGH-5)
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const ALLOWED_EXTS  = ["png", "jpg", "jpeg", "webp", "gif"];

export async function POST(req: NextRequest) {
  const authErr = assertSuperadmin(req);
  if (authErr) return authErr;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPG, WebP, and GIF are allowed (SVG excluded for security)" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 2 MB" }, { status: 400 });
  }

  const slug = (formData.get("slug") as string | null) ?? "unknown";
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const ext = ALLOWED_EXTS.includes(rawExt) ? rawExt : "png";
  const path = `${slug}/${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) {
    if (uploadErr.message.includes("Bucket not found") || uploadErr.message.includes("does not exist")) {
      return NextResponse.json(
        { error: "Storage bucket 'tenant-logos' not found. Create it in Supabase → Storage." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: data.publicUrl });
}
