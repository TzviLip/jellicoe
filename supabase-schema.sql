-- ============================================================
-- DXA App — Supabase schema
-- Run this entire file in the Supabase SQL Editor
-- (Database → SQL Editor → New query → paste → Run)
-- ============================================================

-- 1. Patient submissions (from public form — no auth required)
create table if not exists patient_submissions (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),

  -- Status lifecycle
  status              text not null default 'pending_radiographer'
                      check (status in ('pending_radiographer', 'pending_doctor', 'complete')),

  -- Section 1: Consultation type
  consultation_type   text[] not null default '{}',

  -- Section 2: Demographics
  full_name           text not null,
  id_number           text not null,
  date_of_birth       date,
  sex                 text,
  ethnicity           text,

  -- Section 3: Measurements
  height_cm           numeric,
  weight_kg           numeric,
  bmi                 numeric,

  -- Section 4: Fracture phenotype
  fragility_fractures text,
  vertebral_fractures text,
  height_loss_cm      numeric,
  recent_fracture     text,

  -- Section 5: Risk factors
  additional_risks    text[] default '{}',
  falls_last_year     text,

  -- Radiographer fields (filled in portal)
  dxa_manufacturer    text,
  dxa_model           text,
  dxa_software        text,
  dxa_reference_db    text,
  study_date          date,
  prior_study_date    date,
  dxa_artefacts       text,

  -- DXA results (stored as JSONB for flexibility)
  dxa_results         jsonb default '{}',

  -- TBS
  tbs_value           text,
  tbs_interpretation  text,
  tbs_adjusted_frax   text,

  -- VFA
  vfa_indication      text,
  vfa_fractures       text,
  vfa_summary         text,

  -- Secondary workup
  lab_summary         text,

  -- Risk stratification
  risk_category       text,
  frax_major_hip      text,
  risk_rationale      text,

  -- Therapeutic strategy
  therapeutic_strategy text[],
  treatment_rationale text,

  -- Longitudinal plan
  repeat_dxa_years    text,
  repeat_tbs          text,
  monitoring_plan     text,

  -- Doctor's final report (Phase 3)
  doctor_report       text,
  report_html         text,
  doctor_id           uuid references auth.users(id),
  finalised_at        timestamptz
);

-- 2. Row-level security — patients table is insert-only from public
alter table patient_submissions enable row level security;

-- Anyone can insert (patient form is public)
create policy "Public can insert submissions"
  on patient_submissions for insert
  with check (true);

-- Only authenticated users can read
create policy "Authenticated users can read submissions"
  on patient_submissions for select
  using (auth.role() = 'authenticated');

-- Only authenticated users can update
create policy "Authenticated users can update submissions"
  on patient_submissions for update
  using (auth.role() = 'authenticated');

-- 3. User roles table (links auth.users to roles)
create table if not exists user_roles (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role    text not null check (role in ('radiographer', 'doctor', 'admin')),
  name    text,
  unique (user_id)
);

alter table user_roles enable row level security;

create policy "Users can read their own role"
  on user_roles for select
  using (auth.uid() = user_id);

-- Admins can manage all roles (set this up after creating first admin)
create policy "Admins can manage roles"
  on user_roles for all
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- 4. Email notification config
create table if not exists notification_config (
  id            uuid primary key default gen_random_uuid(),
  event         text not null unique,
  recipient_emails text[] not null default '{}',
  updated_at    timestamptz default now()
);

-- Seed defaults (update emails after setup)
insert into notification_config (event, recipient_emails) values
  ('radiographer_submitted', array['doctor1@yourpractice.com', 'doctor2@yourpractice.com'])
on conflict (event) do nothing;

-- 5. Audit log
create table if not exists audit_log (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  user_id      uuid references auth.users(id),
  action       text not null,
  submission_id uuid references patient_submissions(id),
  detail       jsonb
);

alter table audit_log enable row level security;

create policy "Authenticated users can insert audit events"
  on audit_log for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can read audit log"
  on audit_log for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- After running this SQL:
-- 1. Go to Authentication → Users → Add user
--    Create your radiographer and doctor accounts
-- 2. Then run the role-assignment INSERT below for each user:
--
--   insert into user_roles (user_id, role, name) values
--     ('<paste-user-uuid-here>', 'radiographer', 'Radiographer Name'),
--     ('<paste-user-uuid-here>', 'doctor', 'Dr Smith'),
--     ('<paste-user-uuid-here>', 'doctor', 'Dr Jones');
-- ============================================================

-- ─── RLS for notification_config ─────────────────────────────────────────────
-- (was missing — anyone with anon key could read or modify notification emails)

alter table notification_config enable row level security;

-- Only authenticated users can read
create policy "Authenticated users can read notification config"
  on notification_config for select
  using (auth.role() = 'authenticated');

-- Only doctors/admins can update
create policy "Doctors and admins can update notification config"
  on notification_config for update
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role in ('doctor', 'admin')
    )
  );

-- Nobody can insert or delete via client (managed via admin client only)
-- (no insert/delete policy = blocked for all client requests)
