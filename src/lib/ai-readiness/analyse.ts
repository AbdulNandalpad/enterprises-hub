/**
 * AI Readiness — document analysis via Claude
 *
 * Accepts a file buffer + mime type. Converts to the correct Claude content
 * block (native PDF document, image, or extracted text for DOCX/PPTX).
 * Returns a structured AIReadinessReport.
 */

import type { AIReadinessReport } from "./types";

const ANALYSIS_MODEL   = "claude-sonnet-4-5";
const MAX_TOKENS       = 4096;   // Enough for a full JSON report with room to spare
const FETCH_TIMEOUT_MS = 50_000; // 50s — leaves buffer before Vercel's 60s function kill
const MAX_TEXT_CHARS   = 40_000; // ~10k tokens of input — enough for any business process doc

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Truncate long documents so we stay well within input token limits */
function truncate(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  return (
    text.slice(0, MAX_TEXT_CHARS) +
    "\n\n[Document truncated — first 40,000 characters shown]"
  );
}

/**
 * Attempt to repair a JSON string that was cut off mid-stream (e.g. due to a
 * token limit being hit). Strategy: strip any trailing incomplete token, then
 * close all open arrays and objects in reverse order.
 */
function repairJson(raw: string): string {
  // Remove trailing incomplete string value (unterminated quote)
  let s = raw.replace(/,\s*"[^"]*$/, "").replace(/"[^"]*$/, '""');

  // Remove trailing comma before a closing bracket/brace
  s = s.replace(/,(\s*[}\]])/g, "$1");

  // Count imbalance and close
  const stack: string[] = [];
  let inString = false;
  let escape   = false;

  for (const ch of s) {
    if (escape)        { escape = false; continue; }
    if (ch === "\\")   { escape = true;  continue; }
    if (ch === '"')    { inString = !inString; continue; }
    if (inString)      continue;
    if (ch === "{")    stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  return s + stack.reverse().join("");
}

/** Extract and parse the JSON object from Claude's response text */
function parseReport(text: string, truncated: boolean): AIReadinessReport {
  // Claude sometimes wraps JSON in a markdown fence despite instructions
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Claude did not return a JSON object in its response");

  let jsonStr = match[0];

  // Fast path — valid JSON
  try {
    return JSON.parse(jsonStr) as AIReadinessReport;
  } catch {
    // Only try repair if Claude was cut off at the token limit
    if (!truncated) {
      throw new Error(
        "Claude returned malformed JSON. Try again — the model occasionally produces invalid output."
      );
    }

    // Repair truncated JSON
    try {
      const repaired = repairJson(jsonStr);
      return JSON.parse(repaired) as AIReadinessReport;
    } catch {
      throw new Error(
        "The report was too long to generate in one pass. Try uploading a shorter document " +
        "(max 5 pages recommended)."
      );
    }
  }
}

// ── File → Claude content block ───────────────────────────────────────────────

async function fileToContentBlock(buffer: Buffer, mimeType: string): Promise<object[]> {
  // PDF — extract text with pdf-parse (much faster than binary document API)
  if (mimeType === "application/pdf") {
    try {
      // pdf-parse ESM exports the function directly; CJS wraps it as .default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod    = (await import("pdf-parse")) as any;
      const parse  = typeof mod === "function" ? mod : (mod.default ?? mod);
      const data   = await parse(buffer);
      const text   = truncate((data.text as string) || "(No readable text in PDF)");
      return [{ type: "text", text }];
    } catch {
      // Fallback: send as native document if text extraction fails
      return [
        {
          type:   "document",
          source: {
            type:       "base64",
            media_type: "application/pdf",
            data:       buffer.toString("base64"),
          },
        },
      ];
    }
  }

  // Images — Claude vision
  if (mimeType.startsWith("image/")) {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const media   = allowed.includes(mimeType) ? mimeType : "image/png";
    return [
      {
        type:   "image",
        source: { type: "base64", media_type: media, data: buffer.toString("base64") },
      },
    ];
  }

  // DOCX — extract text with mammoth
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const mammoth = await import("mammoth");
    const result  = await mammoth.extractRawText({ buffer });
    return [{ type: "text", text: truncate(result.value) }];
  }

  // PPTX — extract text from slide XML
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return [{ type: "text", text: truncate(await extractPptxText(buffer)) }];
  }

  // Fallback — treat as plain text
  return [{ type: "text", text: truncate(buffer.toString("utf8")) }];
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  try {
    const { default: JSZip } = await import("jszip").catch(() => ({ default: null }));
    if (!JSZip) return "(Could not extract PPTX text — JSZip not available)";

    const zip        = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort();

    const lines: string[] = [];
    for (const path of slideFiles) {
      const xml  = await zip.files[path].async("text");
      const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text) lines.push(text);
    }
    return lines.join("\n\n") || "(No readable text found in PPTX)";
  } catch {
    return "(Could not extract PPTX text)";
  }
}

// ── Claude prompt ──────────────────────────────────────────────────────────────

function buildPrompt(company: string, industry?: string, description?: string): string {
  return `You are a senior AI transformation consultant. Analyse the business process document for ${company}${industry ? ` (${industry} industry)` : ""} and return a structured AI readiness assessment.
${description ? `\nClient context: ${description}\n` : ""}
Return ONLY a single valid JSON object — no markdown fences, no prose, no preamble. Use this exact schema:

{
  "businessContext": "1-2 sentences describing the company and the processes covered in the document",
  "executiveSummary": "2-3 sentences on the AI transformation potential — specific to their actual processes",
  "processes": [
    {
      "name": "Process name",
      "description": "One sentence describing what this process involves",
      "opportunities": [
        {
          "title": "AI application title (5-8 words)",
          "description": "One sentence: what AI does here and how",
          "impact": "High|Medium|Low",
          "effort": "High|Medium|Low",
          "enterpriseHubFit": "One sentence on the relevant Enterprise Hub feature, or null"
        }
      ]
    }
  ],
  "topQuickWins": [
    {
      "title": "Quick win title (5-8 words)",
      "description": "One sentence: what to do and how to start",
      "estimatedValue": "Specific measurable benefit (e.g. saves 4 h/week per rep, reduces errors by 30%)"
    }
  ],
  "enterpriseHubRecommendations": [
    {
      "feature": "Feature name",
      "howItHelps": "One sentence tied to a specific process from above"
    }
  ]
}

Rules — follow strictly:
- Processes: maximum 4. Opportunities per process: maximum 2.
- topQuickWins: exactly 3. enterpriseHubRecommendations: exactly 2.
- All descriptions: ONE sentence only — no semicolons splitting it into two thoughts.
- Be specific to the document content — no generic AI statements.
- impact/effort: be realistic. Not every opportunity is High/Low.
- estimatedValue: always include a number or percentage. Never say "increases efficiency".
- Enterprise Hub capabilities: AI assistant with live SAP/Salesforce/email context, Azure AD SSO for all enterprise apps, role-based data governance, IMAP email intelligence, Teams/calendar integration.
- enterpriseHubFit: null if no genuine fit. Do not force a fit.
- The JSON must be complete and valid. Do not stop generating before the closing } of the root object.`;
}

// ── Main analysis function ─────────────────────────────────────────────────────

export async function analyseDocument(
  buffer:       Buffer,
  mimeType:     string,
  company:      string,
  industry?:    string,
  description?: string,
): Promise<AIReadinessReport> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const fileBlocks = await fileToContentBlock(buffer, mimeType);
  const prompt     = buildPrompt(company, industry, description);

  const reqBody = {
    model:      ANALYSIS_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role:    "user",
        content: [...fileBlocks, { type: "text", text: prompt }],
      },
    ],
  };

  // ── Fetch with timeout ───────────────────────────────────────────────────────
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta":    "pdfs-2024-09-25",
      },
      body:   JSON.stringify(reqBody),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === "AbortError") {
      throw new Error(
        "Analysis timed out after 50 seconds. Try uploading a shorter document (5 pages or fewer)."
      );
    }
    throw err;
  }
  clearTimeout(timer);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 400)}`);
  }

  // ── Parse response ───────────────────────────────────────────────────────────
  const data = (await res.json()) as {
    content:     Array<{ type: string; text: string }>;
    stop_reason: string;
  };

  const rawText  = data.content?.find((b) => b.type === "text")?.text ?? "";
  const truncated = data.stop_reason === "max_tokens";

  if (truncated) {
    // Log so it's visible in Vercel logs
    console.warn(
      "[ai-readiness] Claude hit max_tokens — attempting JSON repair. " +
        `Output length: ${rawText.length} chars`
    );
  }

  return parseReport(rawText, truncated);
}
