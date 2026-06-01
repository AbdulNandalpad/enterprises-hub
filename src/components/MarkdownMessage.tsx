"use client";

/**
 * MarkdownMessage — lightweight markdown renderer, no external dependency.
 *
 * Supports:
 *   **bold**, *italic*, `code`
 *   # h1, ## h2, ### h3
 *   - bullet lists, 1. numbered lists
 *   --- horizontal rule
 *   Plain paragraphs
 *
 * Used by AIPanel (chat bubbles) and BriefingWidget (morning briefing).
 */

import type React from "react";

/** Render inline markdown: **bold**, *italic*, `code` */
export function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const t = match[0];
    if (t.startsWith("**"))
      parts.push(<strong key={key++} className="font-semibold">{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`"))
      parts.push(
        <code key={key++} className="font-mono text-[0.8em] bg-black/10 dark:bg-white/10 px-1 rounded">
          {t.slice(1, -1)}
        </code>
      );
    else
      parts.push(<em key={key++}>{t.slice(1, -1)}</em>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Render a full markdown document — headings, bullets, numbered lists, HR, paragraphs */
export function MarkdownMessage({ content, className }: { content: string; className?: string }) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line → small gap
    if (line.trim() === "") {
      nodes.push(<div key={i} className="h-1" />);
      i++;
      continue;
    }

    // Headings
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h3) { nodes.push(<p key={i} className="font-semibold text-[0.8rem] uppercase tracking-wide mt-1">{renderInline(h3[1])}</p>); i++; continue; }
    if (h2) { nodes.push(<p key={i} className="font-semibold mt-1">{renderInline(h2[1])}</p>); i++; continue; }
    if (h1) { nodes.push(<p key={i} className="font-bold mt-1">{renderInline(h1[1])}</p>); i++; continue; }

    // Bullet list
    const bullet = line.match(/^[-•*]\s+(.*)/);
    if (bullet) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-•*]\s+(.*)/)) {
        const m = lines[i].match(/^[-•*]\s+(.*)/);
        items.push(
          <li key={i} className="flex gap-1.5 items-start">
            <span className="select-none mt-[0.15rem] flex-shrink-0 text-[var(--text-muted)]">•</span>
            <span>{renderInline(m![1])}</span>
          </li>
        );
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="space-y-0.5 my-0.5">{items}</ul>);
      continue;
    }

    // Numbered list
    const numbered = line.match(/^(\d+)\.\s+(.*)/);
    if (numbered) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+(.*)/)) {
        const m = lines[i].match(/^(\d+)\.\s+(.*)/);
        items.push(
          <li key={i} className="flex gap-1.5 items-start">
            <span className="select-none flex-shrink-0 text-[var(--text-muted)] min-w-[1.2rem]">{m![1]}.</span>
            <span>{renderInline(m![2])}</span>
          </li>
        );
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="space-y-0.5 my-0.5">{items}</ol>);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} className="border-[var(--shell-border)] my-1" />);
      i++;
      continue;
    }

    // Plain paragraph
    nodes.push(<p key={i}>{renderInline(line)}</p>);
    i++;
  }

  return <div className={`space-y-0.5 leading-relaxed ${className ?? ""}`}>{nodes}</div>;
}
