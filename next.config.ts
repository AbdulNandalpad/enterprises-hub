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
          // Prevent clickjacking (superadmin panel in an iframe)
          { key: "X-Frame-Options",        value: "DENY" },
          // Prevent MIME-type sniffing (reduces XSS risk from uploaded files)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Limit referrer info sent to external sites
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
          // Disable browser features not needed by this app
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // Basic XSS protection for older browsers
          { key: "X-XSS-Protection",       value: "1; mode=block" },
        ],
      },
    ];
  },
};

export default nextConfig;
