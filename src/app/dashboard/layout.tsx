import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[var(--paper)]">
        <Topbar />
        <Sidebar />
        <main className="ml-56 pt-14 min-h-screen">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
