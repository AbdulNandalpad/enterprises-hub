import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[--paper]">
      <Topbar />
      <Sidebar />
      <main className="ml-56 pt-14 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
