-- Template applied into each tenant's isolated schema ({{schema}}).
-- Tier-1 silo: one schema + one role per tenant, no cross-schema grants.

create table if not exists {{schema}}.tenant_users (
  sub text primary key,           -- Azure AD object id
  email text not null,
  name text not null,
  role text not null default 'member' check (role in ('member','company_admin')),
  created_at timestamptz not null default now()
);

create table if not exists {{schema}}.connector_configs (
  connector_id text primary key check (connector_id in ('sap','salesforce')),
  enabled boolean not null default false,
  scopes text[] not null default '{}',
  -- Credentials sealed with the tenant data key (envelope encryption).
  sealed_credentials jsonb,
  configured_at timestamptz not null default now()
);

-- Append-only audit log (EU AI Act evidence). No UPDATE/DELETE — enforced
-- by trigger so even the owning role cannot rewrite history.
create table if not exists {{schema}}.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_sub text not null,
  user_name text not null,
  kind text not null check (kind in ('question','report_run','connector_test')),
  question text not null,
  systems text[] not null default '{}',
  outcome text not null
    check (outcome in ('answered','refused_not_entitled','failed','delivered')),
  detail text not null default ''
);

create or replace function {{schema}}.audit_log_immutable() returns trigger as $$
begin
  raise exception 'audit_log is append-only';
end $$ language plpgsql;

drop trigger if exists audit_log_immutable on {{schema}}.audit_log;
create trigger audit_log_immutable
  before update or delete on {{schema}}.audit_log
  for each row execute function {{schema}}.audit_log_immutable();

create table if not exists {{schema}}.query_history (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_sub text not null,
  question text not null,
  answer_summary text not null default '',
  systems text[] not null default '{}'
);

create table if not exists {{schema}}.report_specs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  spec jsonb not null,
  created_by text not null,
  created_at timestamptz not null default now()
);
