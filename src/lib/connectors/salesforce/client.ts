/**
 * Salesforce REST API helpers — server-side only.
 * All functions take a Bearer access token + instance URL and return typed data.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SFOpportunity {
  Id: string;
  Name: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  AccountName: string | null;
  Probability: number | null;
}

export interface SFContact {
  Id: string;
  Name: string;
  Title: string | null;
  Email: string | null;
  Phone: string | null;
  AccountName: string | null;
}

export interface SFAccount {
  Id: string;
  Name: string;
  Industry: string | null;
  Type: string | null;
  AnnualRevenue: number | null;
}

export interface SFDashboardStats {
  totalOpportunities: number;
  openOpportunities: number;
  totalPipeline: number;
  closedWonThisMonth: number;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function sfFetch<T>(
  instanceUrl: string,
  token: string,
  soql: string
): Promise<T[]> {
  const url = `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 }, // always fresh
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Salesforce API error ${res.status}: ${text}`);
  }

  const data = await res.json() as { records: T[]; totalSize: number };
  return data.records ?? [];
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/** Recent open + closed opportunities */
export async function getOpportunities(
  instanceUrl: string,
  token: string,
  limit = 10
): Promise<SFOpportunity[]> {
  const soql = `
    SELECT Id, Name, StageName, Amount, CloseDate, Account.Name, Probability
    FROM Opportunity
    WHERE IsClosed = false OR (IsClosed = true AND CloseDate = THIS_MONTH)
    ORDER BY LastModifiedDate DESC
    LIMIT ${limit}
  `.trim().replace(/\s+/g, " ");

  const raw = await sfFetch<{
    Id: string; Name: string; StageName: string; Amount: number | null;
    CloseDate: string; Probability: number | null;
    Account: { Name: string } | null;
  }>(instanceUrl, token, soql);

  return raw.map((r) => ({
    Id: r.Id,
    Name: r.Name,
    StageName: r.StageName,
    Amount: r.Amount,
    CloseDate: r.CloseDate,
    AccountName: r.Account?.Name ?? null,
    Probability: r.Probability,
  }));
}

/** Recent contacts */
export async function getContacts(
  instanceUrl: string,
  token: string,
  limit = 8
): Promise<SFContact[]> {
  const soql = `
    SELECT Id, Name, Title, Email, Phone, Account.Name
    FROM Contact
    ORDER BY LastModifiedDate DESC
    LIMIT ${limit}
  `.trim().replace(/\s+/g, " ");

  const raw = await sfFetch<{
    Id: string; Name: string; Title: string | null;
    Email: string | null; Phone: string | null;
    Account: { Name: string } | null;
  }>(instanceUrl, token, soql);

  return raw.map((r) => ({
    Id: r.Id,
    Name: r.Name,
    Title: r.Title,
    Email: r.Email,
    Phone: r.Phone,
    AccountName: r.Account?.Name ?? null,
  }));
}

/** Pipeline stats for the KPI strip */
export async function getDashboardStats(
  instanceUrl: string,
  token: string
): Promise<SFDashboardStats> {
  const [totalRes, openRes, wonRes] = await Promise.all([
    sfFetch<{ expr0: number }>(instanceUrl, token,
      "SELECT COUNT() FROM Opportunity"),
    sfFetch<{ expr0: number; expr1: number }>(instanceUrl, token,
      "SELECT COUNT(), SUM(Amount) FROM Opportunity WHERE IsClosed = false"),
    sfFetch<{ expr0: number }>(instanceUrl, token,
      "SELECT COUNT() FROM Opportunity WHERE IsWon = true AND CloseDate = THIS_MONTH"),
  ]);

  return {
    totalOpportunities: (totalRes[0] as unknown as { size: number })?.size ?? 0,
    openOpportunities:  (openRes[0]  as unknown as { size: number })?.size ?? 0,
    totalPipeline:      (openRes[0]  as unknown as { expr1: number })?.expr1 ?? 0,
    closedWonThisMonth: (wonRes[0]   as unknown as { size: number })?.size ?? 0,
  };
}
