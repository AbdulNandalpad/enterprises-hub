const apps = [
  { name: "SAP C4C", category: "CRM", color: "#0070F2", icon: "S", href: "#" },
  { name: "SAP S/4", category: "ERP", color: "#0070F2", icon: "S", href: "#" },
  { name: "Microsoft Teams", category: "Collaboration", color: "#5B5EA6", icon: "T", href: "#" },
  { name: "Jira", category: "Projects", color: "#0052CC", icon: "J", href: "#" },
  { name: "Salesforce", category: "CRM", color: "#00A1E0", icon: "SF", href: "#" },
  { name: "ServiceNow", category: "ITSM", color: "#81B5A1", icon: "SN", href: "#" },
  { name: "Adobe Sign", category: "Documents", color: "#FA0F00", icon: "A", href: "#" },
  { name: "Power BI", category: "Analytics", color: "#F2C811", icon: "BI", href: "#" },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[--ink] mb-1">Good morning, Abdul</h1>
        <p className="text-[--ink4] text-sm font-light">All your enterprise apps in one place.</p>
      </div>

      <section>
        <p className="font-mono text-[11px] font-medium text-[--ink4] tracking-widest uppercase mb-4">
          Your Apps
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {apps.map((app) => (
            <a
              key={app.name}
              href={app.href}
              className="group bg-white border border-[--rule] p-5 hover:border-[--ink3] hover:shadow-sm transition-all"
            >
              <div
                className="w-10 h-10 rounded flex items-center justify-center text-white font-mono font-semibold text-sm mb-3"
                style={{ backgroundColor: app.color }}
              >
                {app.icon}
              </div>
              <p className="text-sm font-medium text-[--ink] group-hover:text-[--ink]">{app.name}</p>
              <p className="font-mono text-[10px] text-[--ink4] tracking-wide uppercase mt-0.5">{app.category}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
