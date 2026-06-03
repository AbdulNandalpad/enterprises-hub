export type NodeStatus = "idle" | "connecting" | "extracting" | "done";

export interface SourceNode {
  id:        string;
  label:     string;
  sublabel:  string;
  color:     string;
  glow:      string;
  symbol:    string; // monospace symbol / short code
}

export interface SimEvent {
  t:        number;  // ms from start
  type:     "activate" | "complete" | "narrate" | "brain-peak" | "report-build" | "done";
  nodeId?:  string;
  text?:    string;
  progress?: number;
}

export interface ReportKpi {
  label:    string;
  value:    string;
  delta:    string;
  positive: boolean;
  color:    string;
}

export interface ReportSection {
  title: string;
  type:  "bar" | "line" | "insight";
  data?: Array<{ label: string; value: number; color: string }>;
  text?: string;
}

export interface SimulatedReport {
  title:    string;
  subtitle: string;
  kpis:     ReportKpi[];
  sections: ReportSection[];
}
