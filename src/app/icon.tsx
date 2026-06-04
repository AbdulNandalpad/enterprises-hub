import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Generates the EnterpriseHub favicon as a 32×32 PNG using Next.js ImageResponse.
 * This is the most reliable cross-browser approach — avoids ICO/SVG fallback issues.
 *
 * Logo mark: dark square (top-left) overlapping red square (bottom-right),
 * separated by a 2px white gap — matches the icon in the Topbar.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          position: "relative",
          background: "white",
        }}
      >
        {/* Dark square — top-left */}
        <div
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            width: 17,
            height: 17,
            background: "#050B18",
          }}
        />
        {/* Red square — bottom-right */}
        <div
          style={{
            position: "absolute",
            top: 13,
            left: 13,
            width: 17,
            height: 17,
            background: "#C8341A",
          }}
        />
        {/* 2px white gap pixels so the two blocks read as distinct */}
        <div
          style={{
            position: "absolute",
            top: 2,
            left: 13,
            width: 2,
            height: 2,
            background: "white",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 13,
            left: 2,
            width: 2,
            height: 2,
            background: "white",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
