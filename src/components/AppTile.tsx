import { App } from "@/lib/apps";
import AppIcon from "./AppIcon";

export default function AppTile({ app }: { app: App }) {
  return (
    <a
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative bg-white rounded-xl border border-[var(--shell-border)] p-5 flex flex-col gap-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 overflow-hidden"
    >
      {/* Subtle brand gradient */}
      <div
        className="absolute inset-0 opacity-[0.05] group-hover:opacity-[0.10] transition-opacity"
        style={{ background: `linear-gradient(135deg, ${app.color} 0%, transparent 60%)` }}
      />

      {/* Logo */}
      <div
        className="relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${app.color}18` }}
      >
        <AppIcon slug={app.logo} color={app.color} size={26} />
      </div>

      {/* Text */}
      <div className="relative">
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{app.name}</p>
        <p className="font-mono text-[10px] tracking-widest uppercase mt-1 font-medium" style={{ color: app.color }}>
          {app.category}
        </p>
      </div>

      <span className="absolute bottom-3 right-3 text-[var(--text-muted)] text-xs opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
    </a>
  );
}
