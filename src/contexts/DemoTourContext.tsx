"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Tour step definitions ────────────────────────────────────────────────────

export interface TourStep {
  page:      string;            // path to navigate to when this step becomes active
  badge:     string;            // small label above title (e.g. "Dashboard")
  title:     string;
  body:      string;
  isFinal?:  boolean;           // last step — shows "Get Access" CTA instead of Next
}

export const TOUR_STEPS: TourStep[] = [
  {
    page:  "/dashboard",
    badge: "Welcome",
    title: "Servicesphere — your unified workspace",
    body:  "This is what EnterpriseHub looks like for a real customer. SAP S/4HANA, Salesforce, ServiceNow, Teams — one login, one place.",
  },
  {
    page:  "/dashboard",
    badge: "Dashboard",
    title: "Customisable widget canvas",
    body:  "Every widget pulls live data from a connected system. Add, remove, and reorder to match your workflow. Changes are per-user — not imposed by IT.",
  },
  {
    page:  "/dashboard/integrations",
    badge: "Integrations",
    title: "9 systems — live right now",
    body:  "SAP S/4HANA, Salesforce CRM, ServiceNow, and Microsoft 365 are all connected. Each one feeds the AI layer and the dashboard widgets in real time.",
  },
  {
    page:  "/dashboard/integrations",
    badge: "AI tag",
    title: "The AI badge means live context",
    body:  "Every connector tagged AI feeds live data into Hub's cross-system query engine. Ask \"show me open SAP orders for my Salesforce opportunities closing this week\" — it works.",
  },
  {
    page:  "/dashboard/reports",
    badge: "Reports",
    title: "Cross-system reports in plain English",
    body:  "No SQL, no BI tool, no exports. Describe what you want to know — Hub AI maps the data sources, shows you the plan, and builds the report live.",
  },
  {
    page:  "/dashboard",
    badge: "The pitch",
    title: "One login. All your tools.",
    body:  "EnterpriseHub replaces browser bookmark folders, VPN portals, and copy-paste workflows. Users get one workspace. IT gets one integration point. Security teams get full audit logs.",
    isFinal: true,
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

interface DemoTourCtx {
  step:       number;
  total:      number;
  current:    TourStep;
  isActive:   boolean;
  next:       () => void;
  prev:       () => void;
  dismiss:    () => void;
  restart:    () => void;
  goTo:       (n: number) => void;
}

const DemoTourContext = createContext<DemoTourCtx | null>(null);

const STORAGE_KEY = "eh-demo-tour-step";
const DISMISSED_KEY = "eh-demo-tour-dismissed";

export function DemoTourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [step,      setStep]      = useState(0);
  const [isActive,  setIsActive]  = useState(false);
  const [navigated, setNavigated] = useState(false);

  // On mount: check if we're in demo mode and tour hasn't been dismissed
  useEffect(() => {
    const inDemo = document.cookie.split(";").some((c) => c.trim().startsWith("eh-demo="));
    if (!inDemo) return;

    const dismissed = sessionStorage.getItem(DISMISSED_KEY) === "1";
    if (dismissed) return;

    const saved = parseInt(sessionStorage.getItem(STORAGE_KEY) ?? "0", 10);
    setStep(isNaN(saved) ? 0 : Math.min(saved, TOUR_STEPS.length - 1));
    setIsActive(true);
  }, []);

  const persist = useCallback((n: number) => {
    sessionStorage.setItem(STORAGE_KEY, String(n));
  }, []);

  const navigate = useCallback((targetPage: string) => {
    // Only navigate if not already on the target page
    if (typeof window !== "undefined" && window.location.pathname !== targetPage) {
      setNavigated(true);
      router.push(targetPage);
    }
  }, [router]);

  const next = useCallback(() => {
    const nextStep = Math.min(step + 1, TOUR_STEPS.length - 1);
    setStep(nextStep);
    persist(nextStep);
    navigate(TOUR_STEPS[nextStep].page);
  }, [step, persist, navigate]);

  const prev = useCallback(() => {
    const prevStep = Math.max(step - 1, 0);
    setStep(prevStep);
    persist(prevStep);
    navigate(TOUR_STEPS[prevStep].page);
  }, [step, persist, navigate]);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setIsActive(false);
  }, []);

  const restart = useCallback(() => {
    sessionStorage.removeItem(DISMISSED_KEY);
    sessionStorage.setItem(STORAGE_KEY, "0");
    setStep(0);
    setIsActive(true);
    navigate(TOUR_STEPS[0].page);
  }, [navigate]);

  const goTo = useCallback((n: number) => {
    const target = Math.max(0, Math.min(n, TOUR_STEPS.length - 1));
    setStep(target);
    persist(target);
    navigate(TOUR_STEPS[target].page);
  }, [persist, navigate]);

  // Reset navigation flag after route change
  useEffect(() => {
    if (navigated) setNavigated(false);
  }, [navigated]);

  const ctx: DemoTourCtx = {
    step,
    total:   TOUR_STEPS.length,
    current: TOUR_STEPS[step],
    isActive,
    next,
    prev,
    dismiss,
    restart,
    goTo,
  };

  return (
    <DemoTourContext.Provider value={ctx}>
      {children}
    </DemoTourContext.Provider>
  );
}

export function useDemoTour() {
  const ctx = useContext(DemoTourContext);
  if (!ctx) throw new Error("useDemoTour must be used inside DemoTourProvider");
  return ctx;
}
