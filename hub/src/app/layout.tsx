import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EnterpriseHub",
  description: "One question. Every system. One answer — fully audited.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
