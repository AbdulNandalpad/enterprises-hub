import Link from "next/link";
import { App } from "@/lib/apps";

export default function AppTile({ app }: { app: App }) {
  return (
    <Link
      href={`/dashboard/apps/${app.id}`}
      className="group relative bg-white rounded-xl border border-[var(--shell-border)] p-5 flex flex-col gap-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 overflow-hidden"
    >
      {/* Brand colour gradient background */}
      <div
        className="absolute inset-0 opacity-[0.06] group-hover:opacity-[0.10] transition-opacity"
        style={{ background: `linear-gradient(135deg, ${app.color} 0%, transparent 60%)` }}
      />

      {/* Logo container */}
      <div
        className="relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
        style={{ backgroundColor: app.color }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://cdn.simpleicons.org/${app.logo}/ffffff`}
          alt={app.name}
          width={26}
          height={26}
          className="object-contain"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = "none";
            const fallback = el.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        <span
          className="hidden items-center justify-center text-white font-bold text-sm w-full h-full absolute inset-0 rounded-xl"
          style={{ backgroundColor: app.color }}
        >
          {app.name.slice(0, 2)}
        </span>
      </div>

      {/* Text */}
      <div className="relative">
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{app.name}</p>
        <p
          className="font-mono text-[10px] tracking-widest uppercase mt-1 font-medium"
          style={{ color: app.color }}
        >
          {app.category}
        </p>
      </div>

      {/* Arrow */}
      <span className="absolute bottom-3 right-3 text-[var(--text-muted)] text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        ↗
      </span>
    </Link>
  );
}
