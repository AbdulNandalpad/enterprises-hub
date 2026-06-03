/**
 * AI Readiness — email report generation + sending via Resend
 *
 * Generates a professional HTML email report from the analysis result
 * and delivers it to the lead's email address.
 */

import { Resend } from "resend";
import type { AIReadinessReport, ReadinessSubmission } from "./types";

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "AI Readiness <reports@enterprises-hub.de>";
const DEMO_URL     = process.env.NEXT_PUBLIC_HUB_URL ?? "https://enterprises-hub.de";

// ── Impact / effort colour helpers ────────────────────────────────────────────

function impactColor(level: string): string {
  return level === "High" ? "#15803d" : level === "Medium" ? "#b45309" : "#6b7280";
}

function impactBg(level: string): string {
  return level === "High" ? "#dcfce7" : level === "Medium" ? "#fef3c7" : "#f3f4f6";
}

// ── HTML report template ──────────────────────────────────────────────────────

export function buildReportHtml(
  report: AIReadinessReport,
  lead:   ReadinessSubmission,
): string {
  const processesHtml = report.processes.map((proc) => {
    const oppsHtml = proc.opportunities.map((opp) => `
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#111827; vertical-align:top;">
          <strong>${opp.title}</strong><br>
          <span style="color:#6b7280; font-size:13px;">${opp.description}</span>
          ${opp.enterpriseHubFit ? `<br><span style="font-size:12px; color:#1d4ed8; margin-top:4px; display:inline-block;">🔗 Enterprise Hub: ${opp.enterpriseHubFit}</span>` : ""}
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; text-align:center; vertical-align:top; white-space:nowrap;">
          <span style="display:inline-block; padding:2px 10px; border-radius:99px; font-size:12px; font-weight:600; background:${impactBg(opp.impact)}; color:${impactColor(opp.impact)};">${opp.impact}</span>
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; text-align:center; vertical-align:top; white-space:nowrap;">
          <span style="display:inline-block; padding:2px 10px; border-radius:99px; font-size:12px; font-weight:600; background:${impactBg(opp.effort)}; color:${impactColor(opp.effort)};">${opp.effort}</span>
        </td>
      </tr>`).join("");

    return `
      <div style="margin-bottom:24px;">
        <h3 style="font-size:16px; font-weight:600; color:#111827; margin:0 0 4px 0;">${proc.name}</h3>
        <p style="font-size:13px; color:#6b7280; margin:0 0 12px 0;">${proc.description}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 16px; text-align:left; font-size:12px; font-weight:600; color:#374151; text-transform:uppercase; letter-spacing:0.05em;">AI Opportunity</th>
              <th style="padding:10px 16px; text-align:center; font-size:12px; font-weight:600; color:#374151; text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap;">Impact</th>
              <th style="padding:10px 16px; text-align:center; font-size:12px; font-weight:600; color:#374151; text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap;">Effort</th>
            </tr>
          </thead>
          <tbody>${oppsHtml}</tbody>
        </table>
      </div>`;
  }).join("");

  const quickWinsHtml = report.topQuickWins.map((win, i) => `
    <tr>
      <td style="padding:14px 16px; border-bottom:1px solid #e5e7eb; vertical-align:top;">
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <span style="display:inline-block; width:24px; height:24px; border-radius:50%; background:#1d4ed8; color:white; font-size:12px; font-weight:700; text-align:center; line-height:24px; flex-shrink:0;">${i + 1}</span>
          <div>
            <strong style="font-size:14px; color:#111827;">${win.title}</strong><br>
            <span style="font-size:13px; color:#6b7280;">${win.description}</span><br>
            <span style="font-size:12px; font-weight:600; color:#15803d; margin-top:4px; display:inline-block;">✓ ${win.estimatedValue}</span>
          </div>
        </div>
      </td>
    </tr>`).join("");

  const hubRecsHtml = report.enterpriseHubRecommendations.map((rec) => `
    <tr>
      <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; vertical-align:top;">
        <strong style="font-size:14px; color:#1d4ed8;">${rec.feature}</strong><br>
        <span style="font-size:13px; color:#6b7280;">${rec.howItHelps}</span>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Readiness Report — ${lead.company}</title>
</head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6; padding:40px 20px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px; width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a; padding:32px 40px; border-radius:12px 12px 0 0;">
            <p style="margin:0; font-size:11px; font-weight:600; letter-spacing:0.15em; text-transform:uppercase; color:#6b7280;">Enterprise Hub</p>
            <h1 style="margin:8px 0 4px; font-size:26px; font-weight:700; color:#ffffff;">AI Readiness Report</h1>
            <p style="margin:0; font-size:14px; color:#9ca3af;">${lead.company}${lead.industry ? ` · ${lead.industry}` : ""} · Prepared for ${lead.name}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff; padding:40px; border-radius:0 0 12px 12px;">

            <!-- Business context -->
            <p style="font-size:14px; color:#6b7280; line-height:1.6; margin:0 0 32px;">${report.businessContext}</p>

            <!-- Executive Summary -->
            <div style="background:#eff6ff; border-left:4px solid #1d4ed8; padding:20px 24px; border-radius:0 8px 8px 0; margin-bottom:36px;">
              <p style="margin:0 0 6px; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#1d4ed8;">Executive Summary</p>
              <p style="margin:0; font-size:15px; line-height:1.7; color:#1e3a5f;">${report.executiveSummary}</p>
            </div>

            <!-- Processes -->
            <h2 style="font-size:18px; font-weight:700; color:#111827; margin:0 0 20px; padding-bottom:12px; border-bottom:2px solid #e5e7eb;">Business Process Analysis</h2>
            ${processesHtml}

            <!-- Quick Wins -->
            <h2 style="font-size:18px; font-weight:700; color:#111827; margin:36px 0 16px; padding-bottom:12px; border-bottom:2px solid #e5e7eb;">Top Quick Wins</h2>
            <p style="font-size:13px; color:#6b7280; margin:0 0 16px;">Highest-impact AI initiatives you can start within 30–90 days.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; margin-bottom:36px;">
              <tbody>${quickWinsHtml}</tbody>
            </table>

            <!-- Enterprise Hub -->
            <h2 style="font-size:18px; font-weight:700; color:#111827; margin:0 0 8px; padding-bottom:12px; border-bottom:2px solid #e5e7eb;">How Enterprise Hub Fits</h2>
            <p style="font-size:13px; color:#6b7280; margin:0 0 16px;">Specific Enterprise Hub capabilities that map to your processes.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #dbeafe; border-radius:8px; overflow:hidden; margin-bottom:36px; background:#eff6ff;">
              <tbody>${hubRecsHtml}</tbody>
            </table>

            <!-- CTA -->
            <div style="background:#0a0a0a; padding:32px; border-radius:12px; text-align:center;">
              <p style="margin:0 0 8px; font-size:20px; font-weight:700; color:#ffffff;">Ready to implement these opportunities?</p>
              <p style="margin:0 0 24px; font-size:14px; color:#9ca3af;">Enterprise Hub connects your AI assistant directly to Salesforce, SAP, email, and Teams — so your team gets answers from live data, not static reports.</p>
              <a href="${DEMO_URL}?utm_source=ai-readiness&utm_medium=email&utm_campaign=${encodeURIComponent(lead.company)}"
                 style="display:inline-block; background:#1d4ed8; color:#ffffff; padding:14px 32px; border-radius:8px; font-size:14px; font-weight:600; text-decoration:none;">
                Book a Demo →
              </a>
            </div>

            <!-- Footer -->
            <p style="font-size:11px; color:#9ca3af; text-align:center; margin:32px 0 0; line-height:1.6;">
              This report was generated by Enterprise Hub AI Readiness Analyser.<br>
              © ${new Date().getFullYear()} Enterprise Hub · <a href="${DEMO_URL}" style="color:#9ca3af;">enterprises-hub.de</a>
            </p>

          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Send via Resend ───────────────────────────────────────────────────────────

export async function sendReportEmail(
  report: AIReadinessReport,
  lead:   ReadinessSubmission,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const resend = new Resend(apiKey);
  const html   = buildReportHtml(report, lead);

  const { error } = await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      [lead.email],
    subject: `Your AI Readiness Report — ${lead.company}`,
    html,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}
