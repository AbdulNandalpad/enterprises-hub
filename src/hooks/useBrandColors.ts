import { useState, useEffect } from "react";

export const DEFAULT_BRAND_COLORS = [
  "#F0A500",
  "#00A1E0",
  "#22C55E",
  "#C8341A",
  "#7C3AED",
  "#F97316",
];

const KEY = "hub-brand-colors";

export function useBrandColors() {
  const [colors, setColors] = useState<string[]>(DEFAULT_BRAND_COLORS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length >= 2) setColors(parsed);
      }
    } catch {}
  }, []);

  const save = (next: string[]) => {
    setColors(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };

  const reset = () => save([...DEFAULT_BRAND_COLORS]);

  return { colors, save, reset };
}
