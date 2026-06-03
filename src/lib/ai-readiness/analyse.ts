/**
 * AI Readiness — document analysis via Claude (streaming)
 *
 * Uses Claude's streaming API so the function doesn't time out waiting for
 * a single large response. Tokens are consumed as they arrive; the full JSON
 * is assembled once the stream closes.
 */

import type { AIReadinessReport } from "./types";

const ANALYSIS_MODEL   = "claude-sonnet-4-5";
const MAX_TOKENS       = 4096;
const STREAM_TIMEOUT_MS = 55_000; // abort if no response starts within 55s
const MAX_TEXT_CHARS   = 20_000;  // ~5k tokens — enough for any business process doc

// ── Helpers ────────────────────────────────────────────────────────────────────

function truncate(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  // Take the first 15k chars (process descriptions) + last 5k (KPIs / problems)
  const head = text.slice(0, 15_000);
  const tail  = text.slice(-5_000);
  return head + "\n\n[...middle section omitted...]\n\n" + tail;
}

/**
 * Attempt to close unclosed arrays/objects in a truncated JSON string.
 * Only called when stop_reason === "max_tokens".
 */
function repairJson(raw: string): string {
  // Strip trailing incomplete string / comma
  let s = raw.replace(/,\s*"[^"]*$/, "").replace(/"[^"]*$/, '""');
  s     = s.replace(/,(\s*[}\]])/g, "$1");

  const stack: string[] = [];
  let inStr  = false;
  let escape = false;

  for (const ch of s) {
    if (escape)       { escape = false; continue; }
    if (ch === "\\")  { escape = true;  continue; }
    if (ch === '"')   { inStr = !inStr; continue; }
    if (inStr)        continue;
    if (ch === "{")   stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  return s + stack.reverse().join("");
}

function parseReport(text: string, truncated: boolean): AIReadinessReport {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Claude did not return a JSON object");

  let jsonStr = match[0];

  try {
    return JSON.parse(jsonStr) as AIReadinessReport;
  } catch {
    if (!truncated) {
      throw new Error("Claude returned malformed JSON — please try again");
    }
    try {
      return JSON.parse(repairJson(jsonStr)) as AIReadinessReport;
    } catch {
      throw new Error(
        "The report was too large to generate. Try a shorter document (5 pages or fewer)."
      );
    }
  }
}

// ── File → Claude content block ───────────────────────────────────────────────

async function fileToContentBlock(buffer: Buffer, mimeType: string): Promise<object[]> {
  if (mimeType === "application/pdf") {
    try {
      // pdf-parse ESM exports the function directly; CJS wraps it as .default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod   = (await import("pdf-parse")) as any;
      const parse = typeof mod === "function" ? mod : (mod.default ?? mod);
      const data  = await parse(buffer);
      return [{ type: "text", text: truncate((data.text as string) || "(No readable text in PDF)") }];
    } catch {
      // Fallback to native document block if text extraction fails
      return [
        {
          type:   "document",
          source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
        },
      ];
    }
  }

  if (mimeType.startsWith("image/")) {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const media   = allowed.includes(mimeType) ? mimeType : "image/png";
    return [{ type: "image", source: { type: "base64", media_type: media, data: buffer.toString("base64") } }];
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const mammoth = await import("mammoth");
    const result  = await mammoth.extractRawText({ buffer });
    return [{ type: "text", text: truncate(result.value) }];
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    return [{ type: "text", text: truncate(await extractPptxText(buffer)) }];
  }

  return [{ type: "text", text: truncate(buffer.toString("utf8")) }];
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  try {
    const { default: JSZip } = await import("jszip").catch(() => ({ default: null }));
    if (!JSZip) return "(Could not extract PPTX — JSZip missing)";

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
    return lines.join("\n\n") || "(No readable text in PPTX)";
  } catch {
    return "(Could not extract PPTX text)";
  }
}

// ── Prompt ─────────────────────────────────────────────────────────────────────

function buildPrompt(company: string, industry?: string, description?: string): string {
  return `You are a senior AI transformation consultant. Analyse the business process document for ${company}${industry ? ` (${industry})` : ""} and return a structured AI readiness assessment.
${description ? `\nClient context: ${description}\n` : ""}
Return ONLY a single valid JSON object — no markdown fences, no prose, no preamble. Use this exact schema:

{
  "businessContext": "1-2 sentences describing the company and processes covered",
  "executiveSummary": "2-3 sentences on the AI transformation potential — specific to their actual processes",
  "processes": [
    {
      "name": "Process name",
      "description": "One sentence on what this process involves",
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
      "description": "One sentence: what to implement and how to start",
      "estimatedValue": "Specific measurable benefit (e.g. saves 4 h/week per rep)"
    }
  ],
  "enterpriseHubRecommendations": [
    {
      "feature": "Feature name",
      "howItHelps": "One sentence tied to a specific process from above"
    }
  ]
}

Strict output rules — keep JSON compact:
- processes: max 4 items. opportunities per process: max 2 items.
- topQuickWins: exactly 3 items. enterpriseHubRecommendations: exactly 2 items.
- Every string value: ONE sentence only. No semicolons splitting into two thoughts.
- impact/effort: be realistic — not every item is High/Low.
- estimatedValue: always include a number or percentage.
- Enterprise Hub capabilities: AI assistant with live SAP/Salesforce/email context, Azure AD SSO, role-based data governance, IMAP email intelligence, Teams/calendar integration.
- enterpriseHubFit: null if no genuine fit. Do not force connections.
- The JSON MUST be complete. Do not stop before the final closing brace.`;
}

// ── Streaming Claude call ──────────────────────────────────────────────────────

/**
 * Calls the Claude API with stream:true and reads Server-Sent Events until the
 * stream closes. Returns the assembled text and whether output was truncated.
 */
async function callClaudeStreaming(
  reqBody: object,
  apiKey:  string,
): Promise<{ text: string; truncated: boolean }> {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

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
      body:   JSON.stringify({ ...reqBody, stream: true }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === "AbortError") {
      throw new Error(
        "Analysis timed out — the document may be too large. Try uploading 5 pages or fewer."
      );
    }
    throw err;
  }

  if (!res.ok) {
    clearTimeout(timer);
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 400)}`);
  }

  // Read SSE stream
  const reader  = res.body!.getReader();
  const decoder = new TextDecoder();
  let assembled = "";
  let stopReason = "end_turn";
  let sseBuffer  = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split("\n");
      sseBuffer   = lines.pop() ?? ""; // keep last incomplete line

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const event = JSON.parse(payload) as Record<string, unknown>;

          if (
            event.type === "content_block_delta" &&
            (event.delta as Record<string, unknown>)?.type === "text_delta"
          ) {
            assembled += (event.delta as Record<string, unknown>).text as string;
          }

          if (
            event.type === "message_delta" &&
            (event.delta as Record<string, unknown>)?.stop_reason
          ) {
            stopReason = (event.delta as Record<string, unknown>).stop_reason as string;
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }

  return { text: assembled, truncated: stopReason === "max_tokens" };
}

// ── Main export ────────────────────────────────────────────────────────────────

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

  const { text, truncated } = await callClaudeStreaming(reqBody, apiKey);

  if (truncated) {
    console.warn(
      `[ai-readiness] Claude hit max_tokens — attempting JSON repair. Output: ${text.length} chars`
    );
  }

  return parseReport(text, truncated);
}
