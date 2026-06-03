/**
 * AI Readiness — document analysis via Claude
 *
 * Accepts a file buffer + mime type. Converts to the correct Claude content
 * block (native PDF document, image, or extracted text for DOCX/PPTX).
 * Returns a structured AIReadinessReport.
 */

import type { AIReadinessReport } from "./types";

// claude-sonnet-4-5 is significantly faster than opus (10-15s vs 30-60s)
// and produces equally good structured analysis output
const ANALYSIS_MODEL = "claude-sonnet-4-5";
const MAX_TOKENS     = 4096;
const FETCH_TIMEOUT_MS = 50_000; // 50s — leaves a buffer before Vercel's 60s function kill

// ── File → Claude content block ───────────────────────────────────────────────

async function fileToContentBlock(
  buffer: Buffer,
  mimeType: string,
): Promise<object[]> {
  // PDF — Claude handles natively
  if (mimeType === "application/pdf") {
    return [
      {
        type: "document",
        source: {
          type:       "base64",
          media_type: "application/pdf",
          data:       buffer.toString("base64"),
        },
      },
    ];
  }

  // Images — Claude vision
  if (mimeType.startsWith("image/")) {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const media   = allowed.includes(mimeType) ? mimeType : "image/png";
    return [
      {
        type: "image",
        source: {
          type:       "base64",
          media_type: media,
          data:       buffer.toString("base64"),
        },
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
    return [{ type: "text", text: result.value }];
  }

  // PPTX — extract text from slide XML (basic)
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    const text = await extractPptxText(buffer);
    return [{ type: "text", text }];
  }

  // Fallback — treat as plain text
  return [{ type: "text", text: buffer.toString("utf8") }];
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  // PPTX is a ZIP — extract slide XML and strip tags
  try {
    const { default: JSZip } = await import("jszip").catch(() => ({ default: null }));
    if (!JSZip) return "(Could not extract PPTX text — no JSZip)";

    const zip    = await JSZip.loadAsync(buffer);
    const lines: string[] = [];

    const slideFiles = Object.keys(zip.files).filter((f) =>
      f.match(/^ppt\/slides\/slide\d+\.xml$/)
    );
    slideFiles.sort();

    for (const path of slideFiles) {
      const xml  = await zip.files[path].async("text");
      // Strip XML tags, collapse whitespace
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
  return `You are a senior AI transformation consultant. Your task: analyse the uploaded business process document for ${company}${industry ? ` (${industry})` : ""} and produce a structured AI readiness assessment.

${description ? `Additional context from the client: ${description}\n` : ""}
Return ONLY valid JSON — no markdown fences, no explanation, no preamble. Match this exact structure:

{
  "businessContext": "2-3 sentences summarising the company and processes from the document",
  "executiveSummary": "3-4 sentences summarising the overall AI transformation potential — be specific to their actual processes, not generic",
  "processes": [
    {
      "name": "Name of the process",
      "description": "What this process involves (1-2 sentences)",
      "opportunities": [
        {
          "title": "Specific AI application title",
          "description": "Concrete description of how AI would work here — specific to their process, not generic",
          "impact": "High|Medium|Low",
          "effort": "High|Medium|Low",
          "enterpriseHubFit": "null or a specific Enterprise Hub feature that directly enables this"
        }
      ]
    }
  ],
  "topQuickWins": [
    {
      "title": "Quick win title",
      "description": "Specific implementation approach with concrete next steps",
      "estimatedValue": "Tangible, credible benefit — time saved per week, cost reduction %, headcount freed, etc."
    }
  ],
  "enterpriseHubRecommendations": [
    {
      "feature": "Enterprise Hub feature name",
      "howItHelps": "Specific to their business processes identified above"
    }
  ]
}

Strict rules:
- Maximum 6 processes, 3 opportunities per process, 4 quick wins, 3 Enterprise Hub recommendations
- Be specific to the actual content of their document — no generic AI platitudes
- For enterpriseHubFit: only mention if genuinely relevant. Enterprise Hub capabilities: AI assistant with live Salesforce/SAP/email context, single Azure AD SSO for all enterprise apps, role-based data governance, IMAP email intelligence, Teams integration, calendar context
- impact/effort ratings must be realistic — not everything is "High impact, Low effort"
- estimatedValue must be credible and specific, not vague ("saves 3-5 hours/week per sales rep", not "increases efficiency")
- If the document is not clearly a business process document, work with what you have and note any limitations in businessContext`;
}

// ── Main analysis function ─────────────────────────────────────────────────────

export async function analyseDocument(
  buffer:      Buffer,
  mimeType:    string,
  company:     string,
  industry?:   string,
  description?: string,
): Promise<AIReadinessReport> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const fileBlocks = await fileToContentBlock(buffer, mimeType);
  const prompt     = buildPrompt(company, industry, description);

  const body = {
    model:      ANALYSIS_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role:    "user",
        content: [
          ...fileBlocks,
          { type: "text", text: prompt },
        ],
      },
    ],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        // Required for native PDF document support
        "anthropic-beta":    "pdfs-2024-09-25",
      },
      body:   JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === "AbortError") {
      throw new Error("Analysis timed out after 50 seconds. Try a shorter document.");
    }
    throw err;
  }
  clearTimeout(timer);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err.slice(0, 400)}`);
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const text  = data.content?.find((b) => b.type === "text")?.text ?? "";

  // Extract JSON — Claude sometimes adds prose before/after despite instructions
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Claude did not return valid JSON");

  const report = JSON.parse(match[0]) as AIReadinessReport;
  return report;
}
