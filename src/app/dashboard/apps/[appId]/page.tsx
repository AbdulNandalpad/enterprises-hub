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
        <p className="font-mono text-sm text-[var(--ink4)]">App not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px-64px)]">
      {/* App header bar */}
      <div className="flex items-center gap-4 mb-4 flex-shrink-0">
        <Link
          href="/dashboard"
          className="font-mono text-[11px] text-[var(--ink4)] tracking-widest uppercase hover:text-[var(--ink)] transition-colors"
        >
          ← Dashboard
        </Link>
        <span className="text-[var(--rule)] select-none">|</span>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-white font-mono font-semibold text-[10px]"
            style={{ backgroundColor: app.color }}
          >
            {app.icon}
          </div>
          <span className="font-medium text-sm text-[var(--ink)]">{app.name}</span>
          <span className="font-mono text-[10px] text-[var(--ink4)] tracking-widest uppercase">{app.category}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] tracking-widest uppercase text-[var(--ink3)] hover:text-[var(--ink)] transition-colors"
          >
            Open in new tab ↗
          </a>
        </div>
      </div>

      {/* iFrame or fallback */}
      {iframeBlocked ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white border border-[var(--rule)] gap-6">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-mono font-bold text-xl"
            style={{ backgroundColor: app.color }}
          >
            {app.icon}
          </div>
          <div className="text-center max-w-sm">
            <h2 className="font-serif text-xl font-bold text-[var(--ink)] mb-2">{app.name}</h2>
            <p className="text-sm text-[var(--ink4)] font-light mb-6">
              {app.name} restricts embedding for security reasons. Open it directly — your SSO session carries over automatically.
            </p>
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-mono text-[11px] tracking-widest uppercase bg-[var(--ink)] text-[var(--paper)] px-6 py-3 hover:bg-[var(--red)] transition-colors"
            >
              Open {app.name} ↗
            </a>
          </div>
        </div>
      ) : (
        <iframe
          src={app.url}
          className="flex-1 w-full border border-[var(--rule)]"
          title={app.name}
          onError={() => setIframeBlocked(true)}
          onLoad={(e) => {
            try {
              // If we can't access contentDocument, it's cross-origin blocked
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
