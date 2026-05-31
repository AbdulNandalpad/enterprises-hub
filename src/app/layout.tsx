import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Sora } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AIProvider } from "@/contexts/AIContext";
import { UIPrefsProvider } from "@/contexts/UIPrefsContext";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EnterpriseHub — One workspace for all your apps",
  description:
    "Sign in once with Azure AD and get a unified workspace to search, monitor and act across SAP, Salesforce, ServiceNow, Jira and 35+ more systems.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <UIPrefsProvider>
            <AIProvider>
              <AuthProvider>{children}</AuthProvider>
            </AIProvider>
          </UIPrefsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
