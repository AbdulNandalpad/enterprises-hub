-- Control plane: tenant registry, wrapped tenant keys, platform events.
-- Client content NEVER lives here (architecture: operations, not content).

create schema if not exists control_plane;

create table if not exists control_plane.migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists control_plane.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z][a-z0-9_]{1,30}$'),
  name text not null,
  sso_org_id text not null unique,
  region text not null,
  status text not null default 'provisioning'
    check (status in ('provisioning','active','suspended')),
  schema_name text not null unique,
  -- Per-tenant data key, wrapped by the master key (envelope encryption).
  -- Stored here precisely so it is OUTSIDE the tenant schema it protects.
  wrapped_data_key jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists control_plane.platform_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  severity text not null check (severity in ('info','warn')),
  message text not null
);
