-- ============================================================================
-- Voice Actions module — schema migration
-- Target: EnterpriseHub Supabase (Postgres) Config DB
--
-- Notes / deviations from the original spec (intentional, see CLAUDE.md rule:
-- "All DB queries must filter by tenant_id — no cross-tenant data leakage"):
--   1. tenant_id is denormalised onto voice_contacts and voice_call_logs.
--      The spec only put it on agents/campaigns, but listing "contacts" and
--      "call logs for a tenant" then requires multi-hop joins on every read.
--      A direct tenant_id column lets every query filter by tenant cheaply and
--      makes accidental cross-tenant leakage far harder.
--   2. Indexes added for the scheduler hot path (status + next_attempt_at) and
--      for the call-log filters (tenant/campaign/date/outcome).
--   3. ON DELETE CASCADE so removing a tenant/campaign cleans up its children.
--   4. status/outcome/sentiment kept as VARCHAR + CHECK constraints (matches the
--      existing codebase style of string enums validated with zod at the edge).
-- ============================================================================

-- gen_random_uuid() — pgcrypto is enabled by default on Supabase.
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- voice_agents — voice agent configurations per tenant
-- ---------------------------------------------------------------------------
create table if not exists voice_agents (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references tenants(id) on delete cascade,
  name                      varchar(100) not null,
  language                  varchar(10) not null default 'de-DE',
  persona                   text,                       -- system prompt / persona
  goal                      text,                       -- objective for this agent
  voice_model               varchar(50) not null default 'gpt-4o-realtime-preview',
  max_call_duration_seconds int  not null default 300 check (max_call_duration_seconds between 30 and 1800),
  escalation_phone          varchar(50),                -- human fallback number
  active                    boolean not null default true,
  created_at                timestamptz not null default now()
);
create index if not exists idx_voice_agents_tenant on voice_agents(tenant_id);

-- ---------------------------------------------------------------------------
-- voice_campaigns — a batch of calls for a specific agent
-- ---------------------------------------------------------------------------
create table if not exists voice_campaigns (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  agent_id          uuid references voice_agents(id) on delete set null,
  name              varchar(100) not null,
  status            varchar(20) not null default 'draft'
                      check (status in ('draft','scheduled','running','paused','completed')),
  schedule_start    timestamptz,
  call_window_start time not null default '09:00',
  call_window_end   time not null default '18:00',
  timezone          varchar(50) not null default 'Europe/Berlin',
  max_attempts      int  not null default 2  check (max_attempts between 1 and 10),
  retry_delay_hours int  not null default 24 check (retry_delay_hours between 1 and 168),
  created_at        timestamptz not null default now()
);
create index if not exists idx_voice_campaigns_tenant on voice_campaigns(tenant_id);
create index if not exists idx_voice_campaigns_status on voice_campaigns(status);

-- ---------------------------------------------------------------------------
-- voice_contacts — individual contacts to be called in a campaign
-- ---------------------------------------------------------------------------
create table if not exists voice_contacts (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,   -- denormalised (see header)
  campaign_id     uuid not null references voice_campaigns(id) on delete cascade,
  name            varchar(100),
  phone           varchar(50) not null,
  context         jsonb,                       -- e.g. {"quote_ref":"Q-1234","amount":"5000 EUR"}
  status          varchar(20) not null default 'pending'
                    check (status in ('pending','calling','completed','failed','no_answer')),
  attempts        int not null default 0,
  next_attempt_at timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_voice_contacts_campaign on voice_contacts(campaign_id);
create index if not exists idx_voice_contacts_tenant on voice_contacts(tenant_id);
-- Scheduler hot path: "running campaigns → pending contacts due now"
create index if not exists idx_voice_contacts_due
  on voice_contacts(status, next_attempt_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- voice_call_logs — one row per call attempt
-- ---------------------------------------------------------------------------
create table if not exists voice_call_logs (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,   -- denormalised (see header)
  contact_id       uuid references voice_contacts(id) on delete set null,
  campaign_id      uuid references voice_campaigns(id) on delete set null,
  twilio_call_sid  varchar(100),
  status           varchar(20) check (status in ('initiated','in_progress','completed','failed')),
  duration_seconds int,
  outcome          varchar(50) check (outcome in ('confirmed','not_interested','callback_requested','no_answer')),
  sentiment        varchar(20) check (sentiment in ('positive','neutral','negative')),
  -- EU/GDPR: store transcript + summary only. NEVER persist raw audio.
  transcript       text,
  summary          text,
  started_at       timestamptz,
  ended_at         timestamptz
);
create index if not exists idx_voice_call_logs_tenant   on voice_call_logs(tenant_id);
create index if not exists idx_voice_call_logs_campaign on voice_call_logs(campaign_id);
create index if not exists idx_voice_call_logs_started  on voice_call_logs(started_at desc);
create index if not exists idx_voice_call_logs_outcome  on voice_call_logs(outcome);
create unique index if not exists uq_voice_call_logs_sid
  on voice_call_logs(twilio_call_sid) where twilio_call_sid is not null;
