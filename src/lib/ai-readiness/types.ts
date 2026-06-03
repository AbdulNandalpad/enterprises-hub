/**
 * AI Readiness — shared TypeScript types
 */

export interface ReadinessSubmission {
  name:        string;
  email:       string;
  company:     string;
  industry?:   string;
  role?:       string;
  description?: string;
}

export interface AIOpportunity {
  title:             string;
  description:       string;
  impact:            "High" | "Medium" | "Low";
  effort:            "High" | "Medium" | "Low";
  enterpriseHubFit:  string | null;
}

export interface BusinessProcess {
  name:          string;
  description:   string;
  opportunities: AIOpportunity[];
}

export interface QuickWin {
  title:          string;
  description:    string;
  estimatedValue: string;
}

export interface HubRecommendation {
  feature:    string;
  howItHelps: string;
}

export interface AIReadinessReport {
  businessContext:              string;
  executiveSummary:             string;
  processes:                    BusinessProcess[];
  topQuickWins:                 QuickWin[];
  enterpriseHubRecommendations: HubRecommendation[];
}
