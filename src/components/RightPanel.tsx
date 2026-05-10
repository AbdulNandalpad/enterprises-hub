"use client";

import { useEffect, useState } from "react";
import { apps } from "@/lib/apps";
import AppIcon from "./AppIcon";

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const systemStatus = apps.map((a) => ({ name: a.name, logo: a.logo, color: a.color, status: "connected" }));

const meetings = [
  { time: "09:00", title: "Daily Standup", platform: "Teams", color: "#6264A7" },
  { time: "11:00", title: "SAP Review", platform: "Teams", color: "#6264A7" },
  { time: "14:30", title: "Client Call", platform: "Teams", color: "#6264A7" },
];

export default function RightPanel() {
  const now = useLiveClock();

  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex flex-col gap-4">

      {/* Date & Time */}
      <div className="bg-[var(--navy)] rounded-xl p-5 text-white">
        <p className="font-mono text-4xl font-semibold tracking-tight">{timeStr}</p>
        <p className="text-sm text-white/60 mt-1">{dateStr}</p>
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[11px] text-white/60 tracking-widest uppercase">
            SSO Active — All systems go
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-[var(--shell-border)] p-4">
          <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest uppercase mb-1">Apps</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{apps.length}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Connected</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--shell-border)] p-4">
          <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest uppercase mb-1">Tenant</p>
          <p className="text-2xl font-bold text-[var(--active-text)]">1</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Configured</p>
        </div>
      </div>

      {/* Today's meetings placeholder */}
      <div className="bg-white rounded-xl border border-[var(--shell-border)] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[11px] font-semibold text-[var(--text-muted)] tracking-widest uppercase">
            Today&apos;s Meetings
          </p>
          <span className="font-mono text-[10px] text-[var(--active-text)]">via Teams</span>
        </div>
        <div className="flex flex-col gap-2">
          {meetings.map((m) => (
            <div key={m.title} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer">
              <span className="font-mono text-[11px] text-[var(--text-muted)] w-10 flex-shrink-0">{m.time}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{m.title}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{m.platform}</p>
              </div>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-3 font-mono">
          Live sync coming soon
        </p>
      </div>

      {/* Connected systems */}
      <div className="bg-white rounded-xl border border-[var(--shell-border)] p-4">
        <p className="font-mono text-[11px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-3">
          System Status
        </p>
        <div className="flex flex-col gap-2">
          {systemStatus.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${s.color}18` }}
              >
                <AppIcon slug={s.logo} color={s.color} size={13} />
              </span>
              <span className="text-sm text-[var(--text-secondary)] flex-1 truncate">{s.name}</span>
              <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                OK
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
