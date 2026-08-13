/** Sign-in — the only unauthenticated page in the product. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message =
    error === "no-tenant"
      ? "Your organization is not registered with EnterpriseHub yet."
      : error === "state" || error === "auth"
        ? "Sign-in didn't complete. Please try again."
        : null;

  return (
    <main
      style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "24px",
        textAlign: "center", padding: "32px",
      }}
    >
      <a className="wordmark" style={{ fontSize: 26 }}>
        enterprises<i>·</i><em>hub</em>
      </a>
      <p style={{ color: "var(--eh-text-2, var(--text-2))", maxWidth: 380, lineHeight: 1.6 }}>
        Ask across every system your company runs — one answer, with sources,
        fully audited.
      </p>
      <a className="btn-primary" href="/api/auth/login" style={{ textDecoration: "none" }}>
        Sign in with Microsoft
      </a>
      {message ? (
        <p style={{ color: "var(--text-2)", fontSize: 13, maxWidth: 380 }}>{message}</p>
      ) : null}
    </main>
  );
}
