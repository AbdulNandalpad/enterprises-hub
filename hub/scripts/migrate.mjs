// Control-plane migration runner: node scripts/migrate.mjs
// Applies src/data/migrations/0*.sql in order, recording each in
// control_plane.migrations. Tenant schemas are created by the
// provisioning service, not here.
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set — refusing to run (fail closed).");
  process.exit(1);
}
const dir = join(dirname(fileURLToPath(import.meta.url)), "../src/data/migrations");
const files = readdirSync(dir).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
const sql = postgres(url, { max: 1, prepare: false });

try {
  await sql`create schema if not exists control_plane`;
  await sql`create table if not exists control_plane.migrations (
    id text primary key, applied_at timestamptz not null default now())`;
  for (const file of files) {
    const done = await sql`select 1 from control_plane.migrations where id = ${file}`;
    if (done.length) { console.log(`skip  ${file}`); continue; }
    await sql.unsafe(readFileSync(join(dir, file), "utf8"));
    await sql`insert into control_plane.migrations (id) values (${file})`;
    console.log(`apply ${file}`);
  }
  console.log("migrations complete");
} finally {
  await sql.end();
}
