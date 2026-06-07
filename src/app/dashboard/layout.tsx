import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { DemoTourProvider } from "@/contexts/DemoTourContext";
import { DemoTour } from "@/components/demo/DemoTour";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DemoTourProvider>
        <div className="min-h-screen bg-[var(--shell-bg)]">
          <Topbar />
          <Sidebar />
          <DashboardShell>{children}</DashboardShell>
          {/* Floating guided tour card — only visible in demo mode */}
          <DemoTour />
        </div>
      </DemoTourProvider>
    </AuthGuard>
  );
}
