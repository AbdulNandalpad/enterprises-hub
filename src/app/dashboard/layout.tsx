import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[var(--shell-bg)]">
        <Topbar />
        <Sidebar />
        <DashboardShell>{children}</DashboardShell>
      </div>
    </AuthGuard>
  );
}
