-- LexVault Database Schema
-- Run this in your Supabase SQL editor after creating a project.
-- Enable Row Level Security on all tables after creation.

-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Vault Users ─────────────────────────────────────────────────────────────

create table vault_users (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  email           text not null unique,
  password_hash   text not null,
  role            text not null check (role in ('advocate', 'client', 'junior')),
  bar_number      text,
  is_verified     boolean not null default false,
  enrolled_at     timestamptz not null default now(),
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_vault_users_email on vault_users (email);
create index idx_vault_users_role  on vault_users (role);

-- ─── Cases ───────────────────────────────────────────────────────────────────

create table vault_cases (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  case_number     text,
  court           text,
  case_type       text not null,
  status          text not null default 'active'
                    check (status in ('active', 'pending', 'closed', 'archived')),
  client_name     text not null,
  advocate_name   text,
  next_hearing    date,
  description     text,
  created_by      uuid not null references vault_users (id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_vault_cases_created_by on vault_cases (created_by);
create index idx_vault_cases_status     on vault_cases (status);
create index idx_vault_cases_created_at on vault_cases (created_at desc);

-- ─── Case Members (access control) ───────────────────────────────────────────

create table vault_case_members (
  case_id     uuid not null references vault_cases (id) on delete cascade,
  user_id     uuid not null references vault_users (id) on delete cascade,
  access_role text not null check (access_role in ('owner', 'advocate', 'client', 'junior', 'viewer')),
  added_at    timestamptz not null default now(),
  added_by    uuid references vault_users (id),
  primary key (case_id, user_id)
);

create index idx_vault_case_members_user_id on vault_case_members (user_id);

-- ─── Documents ───────────────────────────────────────────────────────────────

create table vault_documents (
  id              uuid primary key default uuid_generate_v4(),
  case_id         uuid not null references vault_cases (id) on delete cascade,
  uploaded_by     uuid not null references vault_users (id) on delete restrict,
  original_name   text not null,
  stored_name     text not null unique,      -- UUID filename on storage
  file_size       bigint not null,
  mime_type       text not null,
  storage_path    text not null,             -- path in Supabase Storage bucket
  is_encrypted    boolean not null default true,
  document_type   text,                      -- petition, affidavit, notice, etc.
  description     text,
  uploaded_at     timestamptz not null default now(),
  deleted_at      timestamptz                -- soft delete
);

create index idx_vault_docs_case_id     on vault_documents (case_id) where deleted_at is null;
create index idx_vault_docs_uploaded_by on vault_documents (uploaded_by);

-- ─── Document Access Log ─────────────────────────────────────────────────────

create table vault_document_access (
  id            uuid primary key default uuid_generate_v4(),
  document_id   uuid not null references vault_documents (id) on delete cascade,
  accessed_by   uuid not null references vault_users (id) on delete restrict,
  action        text not null check (action in ('view', 'download', 'signed_url_generated', 'upload', 'delete')),
  ip_address    inet,
  user_agent    text,
  accessed_at   timestamptz not null default now()
);

create index idx_vault_doc_access_doc_id on vault_document_access (document_id);
create index idx_vault_doc_access_user   on vault_document_access (accessed_by);
create index idx_vault_doc_access_at     on vault_document_access (accessed_at desc);

-- ─── Audit Logs ──────────────────────────────────────────────────────────────

create table vault_audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references vault_users (id) on delete set null,
  case_id     uuid references vault_cases (id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  ip_address  inet,
  logged_at   timestamptz not null default now()
);

create index idx_vault_audit_user_id  on vault_audit_logs (user_id);
create index idx_vault_audit_case_id  on vault_audit_logs (case_id);
create index idx_vault_audit_logged_at on vault_audit_logs (logged_at desc);

-- ─── Case Messages (team chat) ────────────────────────────────────────────────

create table vault_case_messages (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid not null references vault_cases (id) on delete cascade,
  sender_id   uuid not null references vault_users (id) on delete restrict,
  body        text not null,
  is_internal boolean not null default false,  -- true = visible to lawyers only
  sent_at     timestamptz not null default now(),
  edited_at   timestamptz,
  deleted_at  timestamptz
);

create index idx_vault_msgs_case_id on vault_case_messages (case_id) where deleted_at is null;
create index idx_vault_msgs_sent_at on vault_case_messages (sent_at desc);

-- ─── Client Requests ─────────────────────────────────────────────────────────

create table vault_requests (
  id              uuid primary key default uuid_generate_v4(),
  case_id         uuid not null references vault_cases (id) on delete cascade,
  requested_by    uuid not null references vault_users (id) on delete restrict,
  request_type    text not null check (request_type in ('document_upload', 'status_update', 'meeting', 'query', 'other')),
  title           text not null,
  description     text,
  priority        text not null default 'normal' check (priority in ('urgent', 'high', 'normal', 'low')),
  status          text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  resolved_by     uuid references vault_users (id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_vault_requests_case_id on vault_requests (case_id);
create index idx_vault_requests_status  on vault_requests (status);

-- ─── Updated_at trigger ───────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger vault_users_updated_at     before update on vault_users     for each row execute function set_updated_at();
create trigger vault_cases_updated_at     before update on vault_cases     for each row execute function set_updated_at();
create trigger vault_requests_updated_at  before update on vault_requests  for each row execute function set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Enable after wiring Supabase Auth.
-- alter table vault_users         enable row level security;
-- alter table vault_cases         enable row level security;
-- alter table vault_case_members  enable row level security;
-- alter table vault_documents     enable row level security;
-- alter table vault_document_access enable row level security;
-- alter table vault_audit_logs    enable row level security;
-- alter table vault_case_messages enable row level security;
-- alter table vault_requests      enable row level security;
