import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.simpleicons.org",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // ── Clickjacking ───────────────────────────────────────────────────
          { key: "X-Frame-Options",        value: "DENY" },
          // ── MIME sniffing ──────────────────────────────────────────────────
          { key: "X-Content-Type-Options", value: "nosniff" },
          // ── Referrer ───────────────────────────────────────────────────────
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
          // ── Feature policy ─────────────────────────────────────────────────
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // ── Legacy XSS filter ──────────────────────────────────────────────
          { key: "X-XSS-Protection",       value: "1; mode=block" },
          // ── HSTS — enforce HTTPS for 1 year (production only) ─────────────
          // Vercel strips this on preview deployments; safe to include always.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // ── Content Security Policy ────────────────────────────────────────
          // 'unsafe-inline' for styles is required by Framer Motion (inline transforms).
          // 'unsafe-eval' is NOT included — no eval anywhere in the codebase.
          // worker-src blob: required by MSAL popup auth flow.
          // connect-src includes Azure AD, Supabase, and Anthropic AI endpoints.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",        // Next.js hydration scripts
              "style-src 'self' 'unsafe-inline'",         // Framer Motion inline styles
              "img-src 'self' data: blob: https:",        // external logos/avatars
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://login.microsoftonline.com https://graph.microsoft.com https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com https://cdn.simpleicons.org",
              "frame-src https://login.microsoftonline.com", // MSAL popup/iframe
              "worker-src blob:",                          // MSAL popup worker
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
