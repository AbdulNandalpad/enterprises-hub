# EnterpriseHub

**An AI analyst for enterprise systems — with compliance built in.**

Ask a question in plain language; it queries your live systems (SAP, Salesforce),
joins the results, and answers with citations — and every query lands in an audit
trail your legal team can approve.

## Repo status

This repo is currently a **marketing-site shell** while the product is rebuilt from
scratch (v2). The previous full application (v1) is preserved in git history —
see `CLAUDE.md` for recovery pointers and the v2 build plan.

## Development

```bash
npm install
npm run dev   # serves the marketing page at http://localhost:3001
```

`index.html` is the landing page, served by `src/app/route.ts`.
