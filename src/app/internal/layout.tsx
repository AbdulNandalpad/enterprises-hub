/**
 * /internal layout — standalone, no shared app chrome (no Topbar/Sidebar/AuthProvider).
 */
export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
