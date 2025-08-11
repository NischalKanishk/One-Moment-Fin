-- Migration: Refactor to Versioned JSON Assessments
-- This migration creates new tables for the versioned JSON assessment system
-- while preserving existing data structure for backward compatibility

-- 1) Forms & versions (immutable)
create table if not exists assessment_forms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists assessment_form_versions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references assessment_forms(id) on delete cascade,
  version int not null,
  schema jsonb not null,  -- JSON Schema for render/validate
  ui jsonb,               -- optional layout hints
  scoring jsonb,          -- weights/rules/category cutoffs
  created_at timestamptz not null default now(),
  unique(form_id, version)
);
create index if not exists idx_af_versions_form on assessment_form_versions(form_id);

-- 2) Default form pointer on users
alter table users add column if not exists default_assessment_form_id uuid
  references assessment_forms(id) on delete set null;

-- 3) Optional per-lead override (assign a specific form; pin a version if desired)
create table if not exists lead_assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  form_id uuid not null references assessment_forms(id) on delete restrict,
  version_id uuid references assessment_form_versions(id),  -- null => always latest
  created_at timestamptz not null default now(),
  unique(user_id, lead_id)
);

-- 4) Submissions (answers + computed score + risk category)
create table if not exists assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,     -- null for new intake
  form_id uuid not null references assessment_forms(id) on delete restrict,
  version_id uuid not null references assessment_form_versions(id),
  filled_by text not null check (filled_by in ('lead','mfd')),
  answers jsonb not null,                   -- validated by version.schema
  score numeric,
  risk_category text,
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  review_reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_as_user_lead on assessment_submissions(user_id, lead_id, created_at desc);

-- 5) Optional expiring links for per-lead sends
create table if not exists assessment_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid not null references users(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,  -- null => new lead intake
  form_id uuid not null references assessment_forms(id) on delete restrict,
  version_id uuid,                                      -- freeze version if set
  status text not null default 'active' check (status in ('active','submitted','expired','revoked')),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_al_user_status on assessment_links(user_id, status, expires_at);

-- Enable RLS scaffolding (add policies later)
alter table assessment_forms            enable row level security;
alter table assessment_form_versions    enable row level security;
alter table lead_assessment_assignments enable row level security;
alter table assessment_submissions      enable row level security;
alter table assessment_links            enable row level security;

-- Create RLS policies for Clerk authentication
-- Assessment Forms policies
create policy "Users can view own assessment forms" on assessment_forms
    for select using (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

create policy "Users can insert own assessment forms" on assessment_forms
    for insert with check (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

create policy "Users can update own assessment forms" on assessment_forms
    for update using (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

create policy "Users can delete own assessment forms" on assessment_forms
    for delete using (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

-- Assessment Form Versions policies
create policy "Users can view own assessment form versions" on assessment_form_versions
    for select using (
        form_id in (
            select id from assessment_forms where user_id in (
                select id from users where clerk_id = get_current_user_clerk_id()
            )
        )
    );

create policy "Users can insert own assessment form versions" on assessment_form_versions
    for insert with check (
        form_id in (
            select id from assessment_forms where user_id in (
                select id from users where clerk_id = get_current_user_clerk_id()
            )
        )
    );

create policy "Users can update own assessment form versions" on assessment_form_versions
    for update using (
        form_id in (
            select id from assessment_forms where user_id in (
                select id from users where clerk_id = get_current_user_clerk_id()
            )
        )
    );

create policy "Users can delete own assessment form versions" on assessment_form_versions
    for delete using (
        form_id in (
            select id from assessment_forms where user_id in (
                select id from users where clerk_id = get_current_user_clerk_id()
            )
        )
    );

-- Lead Assessment Assignments policies
create policy "Users can view own lead assessment assignments" on lead_assessment_assignments
    for select using (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

create policy "Users can insert own lead assessment assignments" on lead_assessment_assignments
    for insert with check (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

create policy "Users can update own lead assessment assignments" on lead_assessment_assignments
    for update using (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

create policy "Users can delete own lead assessment assignments" on lead_assessment_assignments
    for delete using (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

-- Assessment Submissions policies
create policy "Users can view own assessment submissions" on assessment_submissions
    for select using (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

create policy "Users can insert own assessment submissions" on assessment_submissions
    for insert with check (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

create policy "Users can update own assessment submissions" on assessment_submissions
    for update using (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

-- Assessment Links policies
create policy "Users can view own assessment links" on assessment_links
    for select using (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

create policy "Users can insert own assessment links" on assessment_links
    for insert with check (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

create policy "Users can update own assessment links" on assessment_links
    for update using (
        user_id in (
            select id from users where clerk_id = get_current_user_clerk_id()
        )
    );

-- Service role policies for all tables
create policy "Service role can manage all assessment forms" on assessment_forms
    for all using (auth.role() = 'service_role');

create policy "Service role can manage all assessment form versions" on assessment_form_versions
    for all using (auth.role() = 'service_role');

create policy "Service role can manage all lead assessment assignments" on lead_assessment_assignments
    for all using (auth.role() = 'service_role');

create policy "Service role can manage all assessment submissions" on assessment_submissions
    for all using (auth.role() = 'service_role');

create policy "Service role can manage all assessment links" on assessment_links
    for all using (auth.role() = 'service_role');

-- Create indexes for performance
create index if not exists idx_assessment_forms_user_id on assessment_forms(user_id);
create index if not exists idx_assessment_forms_active on assessment_forms(is_active);
create index if not exists idx_assessment_submissions_form_version on assessment_submissions(form_id, version_id);
create index if not exists idx_assessment_submissions_status on assessment_submissions(status);
create index if not exists idx_assessment_links_token on assessment_links(token);
create index if not exists idx_assessment_links_expires on assessment_links(expires_at);
