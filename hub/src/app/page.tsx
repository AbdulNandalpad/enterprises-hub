import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, SESSION_COOKIE } from "@/gateway/session";

/**
 * Home — Enterprise Intelligence + app launcher (design screen 01).
 * The skeleton renders the authenticated shell in its zero-connector
 * state; Phase 3 wires the ask bar to the query engine.
 */
export default async function HomePage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;
  if (!user) redirect("/login");

  return (
    <>
      <header className="topbar">
        <div
          style={{
            maxWidth: 1120, margin: "0 auto", padding: "0 32px", height: 56,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <a className="wordmark">enterprises<i>·</i><em>hub</em></a>
            <span style={{ color: "var(--text-2)", fontSize: 13 }}>· {user.tenantSlug}</span>
          </span>
          <form action="/api/auth/logout" method="post">
            <button className="btn-quiet" style={{ fontSize: 13 }}>Sign out</button>
          </form>
        </div>
      </header>
      <main
        style={{
          maxWidth: 1120, margin: "0 auto", padding: "96px 32px",
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", gap: 24,
        }}
      >
        <h1>Welcome, {user.name.split(" ")[0]}</h1>
        <p style={{ color: "var(--text-2)", maxWidth: 460, lineHeight: 1.6 }}>
          Your tenant is provisioned and your sign-in works. Connect your first
          system to start asking questions — the connector setup arrives with
          the query engine in the next phase.
        </p>
        <span className="chip">Phase 2 skeleton · read-only product · audit-first</span>
      </main>
    </>
  );
}
