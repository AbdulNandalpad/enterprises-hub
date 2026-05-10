import Link from "next/link";
import Image from "next/image";
import { App, logoUrl } from "@/lib/apps";

export default function AppTile({ app }: { app: App }) {
  return (
    <Link
      href={`/dashboard/apps/${app.id}`}
      className="group relative bg-white rounded-xl border border-[var(--shell-border)] p-5 flex flex-col gap-4 hover:shadow-md hover:border-transparent transition-all duration-200 overflow-hidden"
    >
      {/* Subtle colour wash in top-right corner */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ backgroundColor: app.color }}
      />

      {/* Logo */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${app.color}18` }}
      >
        <Image
          src={logoUrl(app.logo, app.color)}
          alt={app.name}
          width={28}
          height={28}
          className="object-contain"
          onError={(e) => {
            // fallback to first letter if CDN fails
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Text */}
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{app.name}</p>
        <p
          className="font-mono text-[10px] tracking-widest uppercase mt-1 font-medium"
          style={{ color: app.color }}
        >
          {app.category}
        </p>
      </div>

      {/* Arrow on hover */}
      <span className="absolute bottom-4 right-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity text-xs">
        ↗
      </span>
    </Link>
  );
}
