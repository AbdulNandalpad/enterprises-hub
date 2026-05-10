"use client";

import { use, useState } from "react";
import { getApp } from "@/lib/apps";
import Link from "next/link";

export default function AppViewerPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const app = getApp(appId);
  const [iframeBlocked, setIframeBlocked] = useState(false);

  if (!app) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="font-mono text-sm text-[var(--text-muted)]">App not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px-64px)]">
      {/* App header bar */}
      <div className="flex items-center gap-4 mb-4 flex-shrink-0">
        <Link
          href="/dashboard"
          className="font-mono text-[11px] text-[var(--text-muted)] tracking-widest uppercase hover:text-[var(--text-primary)] transition-colors"
        >
          ← Dashboard
        </Link>
        <span className="text-[var(--shell-border)] select-none">|</span>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-white font-mono font-semibold"
            style={{ backgroundColor: app.color, fontSize: "9px" }}
          >
            {app.icon}
          </div>
          <span className="font-semibold text-sm text-[var(--text-primary)]">{app.name}</span>
          <span className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest uppercase">{app.category}</span>
        </div>
        <div className="ml-auto">
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] tracking-widest uppercase text-[var(--active-text)] hover:underline transition-colors"
          >
            Open in new tab ↗
          </a>
        </div>
      </div>

      {/* iFrame or fallback */}
      {iframeBlocked ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-lg gap-6">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-mono font-bold text-xl"
            style={{ backgroundColor: app.color }}
          >
            {app.icon}
          </div>
          <div className="text-center max-w-sm">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{app.name}</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              {app.name} restricts embedding for security reasons. Open it directly — your SSO session carries over automatically.
            </p>
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-mono text-[11px] tracking-widest uppercase bg-[var(--navy)] text-white px-6 py-3 rounded-md hover:bg-[var(--brand-red)] transition-colors"
            >
              Open {app.name} ↗
            </a>
          </div>
        </div>
      ) : (
        <iframe
          src={app.url}
          className="flex-1 w-full border border-[var(--shell-border)] rounded-lg"
          title={app.name}
          onError={() => setIframeBlocked(true)}
          onLoad={(e) => {
            try {
              const frame = e.currentTarget as HTMLIFrameElement;
              if (!frame.contentDocument) setIframeBlocked(true);
            } catch {
              setIframeBlocked(true);
            }
          }}
        />
      )}
    </div>
  );
}
