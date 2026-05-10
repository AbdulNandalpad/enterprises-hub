"use client";

import { useEffect, useState } from "react";
import { apps } from "@/lib/apps";
import AppIcon from "./AppIcon";
import Link from "next/link";

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const pinnedIds = ["sap-c4c", "teams", "jira", "power-bi"];
const pinnedApps = apps.filter((a) => pinnedIds.includes(a.id));

const meetings = [
  { time: "09:00", title: "Daily Standup", duration: "30 min", color: "#6264A7" },
  { time: "11:00", title: "SAP Pipeline Review", duration: "1 hr", color: "#6264A7" },
  { time: "14:30", title: "Client Call — Trelleborg", duration: "45 min", color: "#6264A7" },
];

const tasks = [
  { title: "Follow up with key account", source: "SAP C4C", priority: "high" },
  { title: "Update opportunity stage", source: "SAP C4C", priority: "medium" },
  { title: "Review open support ticket", source: "ServiceNow", priority: "high" },
  { title: "Approve quote document", source: "Adobe Sign", priority: "medium" },
];

const news = [
  { title: "Q2 Sales targets updated", time: "2h ago", tag: "Sales" },
  { title: "New product launch: Sealing Solutions", time: "Yesterday", tag: "Product" },
  { title: "IT maintenance this Friday 22:00", time: "Yesterday", tag: "IT" },
];

type Tab = "pinned" | "today";

export default function RightPanel() {
  const [tab, setTab] = useState<Tab>("today");
  const now = useLiveClock();

  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* Tabs */}
      <div className="flex bg-white border border-[var(--shell-border)] rounded-xl overflow-hidden mb-4 flex-shrink-0">
        <button
          onClick={() => setTab("pinned")}
          className={`flex-1 py-2.5 text-xs font-mono font-semibold tracking-widest uppercase transition-colors ${
            tab === "pinned"
              ? "bg-[var(--navy)] text-white"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          Pinned
        </button>
        <button
          onClick={() => setTab("today")}
          className={`flex-1 py-2.5 text-xs font-mono font-semibold tracking-widest uppercase transition-colors ${
            tab === "today"
              ? "bg-[var(--navy)] text-white"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          Today
        </button>
      </div>

      {/* Pinned tab */}
      {tab === "pinned" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {pinnedApps.map((app) => (
              <Link
                key={app.id}
                href={`/dashboard/apps/${app.id}`}
                className="group bg-white border border-[var(--shell-border)] rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md hover:border-transparent transition-all text-center"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${app.color}18` }}
                >
                  <AppIcon slug={app.logo} color={app.color} size={22} />
                </div>
                <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{app.name}</p>
                <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: app.color }}>
                  {app.category}
                </p>
              </Link>
            ))}
          </div>

          <div className="bg-white border border-[var(--shell-border)] rounded-xl p-4">
            <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-3">
              All Apps
            </p>
            <div className="flex flex-col gap-1">
              {apps.filter((a) => !pinnedIds.includes(a.id)).map((app) => (
                <Link
                  key={app.id}
                  href={`/dashboard/apps/${app.id}`}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                >
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${app.color}18` }}
                  >
                    <AppIcon slug={app.logo} color={app.color} size={12} />
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">{app.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Today tab */}
      {tab === "today" && (
        <div className="flex flex-col gap-3">

          {/* Clock */}
          <div className="bg-[var(--navy)] rounded-xl p-4 text-white">
            <p className="font-mono text-3xl font-semibold tracking-tight">{timeStr}</p>
            <p className="text-xs text-white/50 mt-0.5">{dateStr}</p>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] text-white/50 tracking-widest uppercase">SSO Active</span>
            </div>
          </div>

          {/* My Tasks */}
          <div className="bg-white rounded-xl border border-[var(--shell-border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[11px] font-semibold text-[var(--text-muted)] tracking-widest uppercase">
                My Tasks
              </p>
              <span className="bg-[var(--brand-red)] text-white font-mono text-[10px] px-2 py-0.5 rounded-full">
                {tasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {tasks.map((task) => (
                <div key={task.title} className="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer">
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      task.priority === "high" ? "bg-red-500" : "bg-amber-400"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--text-primary)] leading-tight">{task.title}</p>
                    <p className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">{task.source}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's meetings */}
          <div className="bg-white rounded-xl border border-[var(--shell-border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[11px] font-semibold text-[var(--text-muted)] tracking-widest uppercase">
                Meetings
              </p>
              <span className="font-mono text-[10px] text-[var(--active-text)]">Outlook</span>
            </div>
            <div className="flex flex-col gap-1">
              {meetings.map((m) => (
                <div key={m.title} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer">
                  <span className="font-mono text-[11px] text-[var(--text-muted)] w-10 flex-shrink-0">{m.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{m.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{m.duration}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-3 font-mono">Live sync — coming soon</p>
          </div>

          {/* Company news */}
          <div className="bg-white rounded-xl border border-[var(--shell-border)] p-4">
            <p className="font-mono text-[11px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-3">
              Company News
            </p>
            <div className="flex flex-col gap-2">
              {news.map((n) => (
                <div key={n.title} className="flex items-start gap-3 cursor-pointer hover:bg-[var(--hover-bg)] p-1.5 rounded-lg transition-colors">
                  <span
                    className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                    style={{
                      backgroundColor: n.tag === "Sales" ? "#EEF2FF" : n.tag === "Product" ? "#F0FDF4" : "#FFF7ED",
                      color: n.tag === "Sales" ? "#2563EB" : n.tag === "Product" ? "#16A34A" : "#EA580C",
                    }}
                  >
                    {n.tag}
                  </span>
                  <div>
                    <p className="text-sm text-[var(--text-primary)] leading-tight">{n.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-3 font-mono">Via SharePoint — coming soon</p>
          </div>

        </div>
      )}
    </div>
  );
}
