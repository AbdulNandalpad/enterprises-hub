/**
 * SAP Sales Cloud (C4C) OData v2 API helpers — server-side only.
 * Auth: HTTP Basic (username + password stored in connector_configs).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SAPOpportunity {
  ObjectID: string;
  Name: string;
  SalesPhaseCode: string;
  SalesPhaseName: string;
  ExpectedValue: string | null;
  CloseDate: string | null;
  AccountName: string | null;
  Probability: string | null;
}

export interface SAPAccount {
  ObjectID: string;
  AccountName: string;
  IndustryCode: string | null;
  CityName: string | null;
  CountryCode: string | null;
}

export interface SAPActivity {
  ObjectID: string;
  Subject: string;
  CategoryCode: string;
  StatusCode: string;
  StartDateTime: string | null;
  AccountName: string | null;
}

export interface SAPStats {
  totalOpportunities: number;
  openOpportunities: number;
  totalAccounts: number;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function basicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function sapFetch<T>(
  instanceUrl: string,
  username: string,
  password: string,
  entity: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const search = new URLSearchParams({
    $format: "json",
    ...params,
  });

  const url = `${instanceUrl}/sap/c4c/odata/v1/c4codata/${entity}?${search.toString()}`;

  const res = await fetch(url, {
    headers: {
      Authorization: basicAuth(username, password),
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SAP API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { d: { results: T[] } };
  return data?.d?.results ?? [];
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export async function getSAPOpportunities(
  instanceUrl: string,
  username: string,
  password: string,
  top = 10
): Promise<SAPOpportunity[]> {
  const raw = await sapFetch<{
    ObjectID: string; Name: string; SalesPhaseCode: string; SalesPhaseName: string;
    ExpectedValue: string | null; CloseDate: string | null;
    ProspectPartyName: string | null; SalesProbability: string | null;
  }>(instanceUrl, username, password, "OpportunityCollection", {
    $select: "ObjectID,Name,SalesPhaseCode,SalesPhaseName,ExpectedValue,CloseDate,ProspectPartyName,SalesProbability",
    $top: String(top),
    $orderby: "LastChangeDateTime desc",
  });

  return raw.map((r) => ({
    ObjectID:      r.ObjectID,
    Name:          r.Name,
    SalesPhaseCode: r.SalesPhaseCode,
    SalesPhaseName: r.SalesPhaseName,
    ExpectedValue:  r.ExpectedValue,
    CloseDate:      r.CloseDate,
    AccountName:    r.ProspectPartyName,
    Probability:    r.SalesProbability,
  }));
}

export async function getSAPAccounts(
  instanceUrl: string,
  username: string,
  password: string,
  top = 10
): Promise<SAPAccount[]> {
  const raw = await sapFetch<{
    ObjectID: string; AccountName: string; IndustryCode: string | null;
    CityName: string | null; CountryCode: string | null;
  }>(instanceUrl, username, password, "AccountCollection", {
    $select: "ObjectID,AccountName,IndustryCode,CityName,CountryCode",
    $top: String(top),
    $orderby: "LastChangeDateTime desc",
  });

  return raw.map((r) => ({
    ObjectID:    r.ObjectID,
    AccountName: r.AccountName,
    IndustryCode: r.IndustryCode,
    CityName:    r.CityName,
    CountryCode: r.CountryCode,
  }));
}

export async function getSAPActivities(
  instanceUrl: string,
  username: string,
  password: string,
  top = 8
): Promise<SAPActivity[]> {
  const raw = await sapFetch<{
    ObjectID: string; Subject: string; CategoryCode: string;
    StatusCode: string; StartDateTime: string | null;
    AccountPartyName: string | null;
  }>(instanceUrl, username, password, "ActivityCollection", {
    $select: "ObjectID,Subject,CategoryCode,StatusCode,StartDateTime,AccountPartyName",
    $top: String(top),
    $orderby: "StartDateTime desc",
  });

  return raw.map((r) => ({
    ObjectID:      r.ObjectID,
    Subject:       r.Subject,
    CategoryCode:  r.CategoryCode,
    StatusCode:    r.StatusCode,
    StartDateTime: r.StartDateTime,
    AccountName:   r.AccountPartyName,
  }));
}

export async function getSAPStats(
  instanceUrl: string,
  username: string,
  password: string
): Promise<SAPStats> {
  const [opps, accounts] = await Promise.all([
    sapFetch<{ SalesPhaseCode: string }>(instanceUrl, username, password, "OpportunityCollection", {
      $select: "SalesPhaseCode",
      $top: "200",
    }),
    sapFetch<{ ObjectID: string }>(instanceUrl, username, password, "AccountCollection", {
      $select: "ObjectID",
      $top: "200",
    }),
  ]);

  const open = opps.filter((o) => !["7", "8"].includes(o.SalesPhaseCode)).length; // 7=won, 8=lost

  return {
    totalOpportunities: opps.length,
    openOpportunities:  open,
    totalAccounts:      accounts.length,
  };
}
