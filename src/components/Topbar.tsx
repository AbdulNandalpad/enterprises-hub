export default function Topbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 bg-[--paper] border-b border-[--rule]">
      <a href="/dashboard" className="flex items-center gap-2 font-mono text-sm font-medium tracking-wide text-[--ink]">
        Enterprise<em className="not-italic text-[--red]">Hub</em>
      </a>

      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-green-700 border border-green-200 bg-green-50 rounded px-2 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          SSO Active
        </span>
        <div className="w-8 h-8 rounded-full bg-[var(--red)] flex items-center justify-center font-mono text-xs text-white font-semibold">
          AN
        </div>
      </div>
    </header>
  );
}
