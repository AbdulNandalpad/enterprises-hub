/**
 * Audit is written in the query path, per tenant, append-only
 * (day-1 rigor list). If the audit write fails, the action fails —
 * an unaudited answer must never be returned.
 */
import { controlPlane } from "@/data/control-plane";
import type { AuditEvent } from "@/core/types";

export async function appendAudit(schemaName: string, ev: AuditEvent): Promise<void> {
  if (!/^[a-z][a-z0-9_]{1,40}$/.test(schemaName)) throw new Error("Invalid schema name");
  const sql = controlPlane();
  await sql.unsafe(
    `insert into ${schemaName}.audit_log (user_sub, user_name, kind, question, systems, outcome, detail)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [ev.userSub, ev.userName, ev.kind, ev.question, ev.systems, ev.outcome, ev.detail],
  );
}
