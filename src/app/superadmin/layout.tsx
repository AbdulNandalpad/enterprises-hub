/**
 * Superadmin layout — standalone, no shared app chrome.
 *
 * The root layout (fonts, ThemeProvider, etc.) still wraps this,
 * but the Topbar / Sidebar / AuthProvider are NOT included here —
 * the superadmin is a fully separate area.
 */

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
