-- ============================================================
-- DXA App — Complete authoritative schema
-- This single file replaces supabase-schema.sql AND
-- supabase-schema-phase4.sql
--
-- Safe to run on a fresh database OR re-run on an existing one.
-- Uses DROP POLICY IF EXISTS and ADD COLUMN IF EXISTS throughout.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. PATIENT SUBMISSIONS
-- ─────────────────────────────────────────────────────────────

create table if not exists patient_submissions (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz default now(),

  -- Workflow status
  status               text not null default 'pending_radiographer'
                       check (status in ('pending_radiographer', 'pending_doctor', 'complete')),

  -- Report generation status
  report_status        text default 'pending'
                       check (report_status in ('pending', 'generating', 'ready', 'fallback', 'failed')),

  -- Concurrent editing soft lock
  claimed_by           uuid references auth.users(id),
  claimed_at           timestamptz,

  -- Section 1: Consultation type
  consultation_type    text[] not null default '{}',

  -- Section 2: Demographics
  full_name            text not null,
  id_number            text not null,
  date_of_birth        date,
  sex                  text,
  ethnicity            text,

  -- Section 3: Measurements
  height_cm            numeric,
  weight_kg            numeric,
  bmi                  numeric,

  -- Section 4: Fracture history
  fragility_fractures  text,
  vertebral_fractures  text,
  height_loss_cm       numeric,
  recent_fracture      text,

  -- Section 5: Risk factors
  additional_risks     text[] default '{}',
  falls_last_year      text,

  -- Section 6–8: DXA data (filled by radiographer)
  dxa_manufacturer     text,
  dxa_model            text,
  dxa_software         text,
  dxa_reference_db     text,
  study_date           date,
  prior_study_date     date,
  dxa_artefacts        text,
  dxa_results          jsonb default '{}',

  -- Section 7: TBS
  tbs_value            text,
  tbs_interpretation   text,
  tbs_adjusted_frax    text,

  -- Section 8: VFA
  vfa_indication       text,
  vfa_fractures        text,
  vfa_summary          text,

  -- Section 9: Labs
  lab_summary          text,

  -- Section 10: Risk
  risk_category        text,
  frax_major_hip       text,
  risk_rationale       text,

  -- Section 11: Therapy
  therapeutic_strategy text[],
  treatment_rationale  text,

  -- Section 12: Plan
  repeat_dxa_years     text,
  repeat_tbs           text,
  monitoring_plan      text,

  -- Doctor report
  report_html          text,
  doctor_report        text,
  doctor_id            uuid references auth.users(id),
  finalised_at         timestamptz
);

-- Add any columns that may be missing on an existing table
alter table patient_submissions add column if not exists report_status  text default 'pending';
alter table patient_submissions add column if not exists claimed_by     uuid references auth.users(id);
alter table patient_submissions add column if not exists claimed_at     timestamptz;

-- Ensure constraint is up to date (drop and recreate idempotently)
alter table patient_submissions
  drop constraint if exists patient_submissions_report_status_check;
alter table patient_submissions
  add constraint patient_submissions_report_status_check
  check (report_status in ('pending', 'generating', 'ready', 'fallback', 'failed'));

-- RLS
alter table patient_submissions enable row level security;

drop policy if exists "Public can insert submissions"               on patient_submissions;
drop policy if exists "Authenticated users can read submissions"    on patient_submissions;
drop policy if exists "Authenticated users can update submissions"  on patient_submissions;

create policy "Public can insert submissions"
  on patient_submissions for insert
  with check (true);

create policy "Authenticated users can read submissions"
  on patient_submissions for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can update submissions"
  on patient_submissions for update
  using (auth.role() = 'authenticated');


-- ─────────────────────────────────────────────────────────────
-- 2. USER ROLES
-- ─────────────────────────────────────────────────────────────

create table if not exists user_roles (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role    text not null check (role in ('radiographer', 'doctor', 'admin')),
  name    text,
  unique (user_id)
);

alter table user_roles enable row level security;

drop policy if exists "Users can read their own role"  on user_roles;
drop policy if exists "Admins can manage roles"        on user_roles;

-- Authenticated users can read their own role (needed for routing after login)
create policy "Users can read their own role"
  on user_roles for select
  using (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE policies for client requests.
-- Roles are assigned only via SQL Editor or the server-side admin client.
-- This prevents any user from escalating their own role.


-- ─────────────────────────────────────────────────────────────
-- 3. NOTIFICATION CONFIG
-- ─────────────────────────────────────────────────────────────

create table if not exists notification_config (
  id               uuid primary key default gen_random_uuid(),
  event            text not null unique,
  recipient_emails text[] not null default '{}',
  updated_at       timestamptz default now()
);

-- Seed events (safe to re-run — on conflict does nothing)
insert into notification_config (event, recipient_emails) values
  ('patient_submitted',     array[]::text[]),
  ('radiographer_submitted', array[]::text[])
on conflict (event) do nothing;

alter table notification_config enable row level security;

drop policy if exists "Authenticated users can read notification config"   on notification_config;
drop policy if exists "Doctors and admins can update notification config"  on notification_config;

create policy "Authenticated users can read notification config"
  on notification_config for select
  using (auth.role() = 'authenticated');

-- Only doctors/admins can update notification config
create policy "Doctors and admins can update notification config"
  on notification_config for update
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role in ('doctor', 'admin')
    )
  );

-- No INSERT/DELETE via client — rows are seeded above, managed via admin client only


-- ─────────────────────────────────────────────────────────────
-- 4. PRACTICE SETTINGS
-- ─────────────────────────────────────────────────────────────
-- Single row. Contains letterhead details and the doctors array.
-- doctors JSONB format: [{ "name": "Dr Smith", "number": "HPCSA 123",
--                          "user_id": "uuid", "email": "dr@practice.com" }]

create table if not exists practice_settings (
  id               uuid primary key default gen_random_uuid(),
  updated_at       timestamptz default now(),

  practice_name    text default 'Bone Density & Osteoporosis Clinic',
  practice_sub     text default 'Subspecialist in Osteoporosis & Bone Health',
  practice_address text default '',
  practice_phone   text default '',
  practice_email   text default '',
  practice_number  text default '',

  -- Dynamic doctor list — replaces old doctor1_*/doctor2_* fixed columns
  doctors          jsonb default '[]'::jsonb
);

-- Add columns that may be missing on older installs
alter table practice_settings add column if not exists doctors jsonb default '[]'::jsonb;

-- Remove old fixed doctor columns if they still exist
alter table practice_settings drop column if exists doctor1_name;
alter table practice_settings drop column if exists doctor1_number;
alter table practice_settings drop column if exists doctor2_name;
alter table practice_settings drop column if exists doctor2_number;

-- Ensure exactly one settings row exists
insert into practice_settings (id)
select gen_random_uuid()
where not exists (select 1 from practice_settings);

alter table practice_settings enable row level security;

drop policy if exists "Authenticated users can read settings"   on practice_settings;
drop policy if exists "Admins and doctors can update settings"  on practice_settings;

create policy "Authenticated users can read settings"
  on practice_settings for select
  using (auth.role() = 'authenticated');

create policy "Admins and doctors can update settings"
  on practice_settings for update
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role in ('admin', 'doctor')
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 5. AUDIT LOG
-- ─────────────────────────────────────────────────────────────

create table if not exists audit_log (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  user_id       uuid references auth.users(id),
  action        text not null,
  submission_id uuid references patient_submissions(id) on delete set null,
  detail        jsonb
);

alter table audit_log enable row level security;

drop policy if exists "Authenticated users can insert audit events"  on audit_log;
drop policy if exists "Authenticated users can read audit log"       on audit_log;

create policy "Authenticated users can insert audit events"
  on audit_log for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can read audit log"
  on audit_log for select
  using (auth.role() = 'authenticated');


-- ============================================================
-- AFTER RUNNING THIS FILE:
--
-- 1. Go to Supabase → Authentication → Users → Add user
--    Create accounts for each radiographer and doctor.
--
-- 2. Assign roles by running in SQL Editor (replace UUIDs):
--
--    insert into user_roles (user_id, role, name) values
--      ('radiographer-uuid', 'radiographer', 'Radiographer Name'),
--      ('doctor1-uuid',      'doctor',       'Dr Smith'),
--      ('doctor2-uuid',      'doctor',       'Dr Jones')
--    on conflict (user_id) do nothing;
--
-- 3. Go to the app → Settings to configure:
--    - Practice letterhead details
--    - Doctor signatures (click "This is me" on your entry)
--    - Radiographer notification emails
--
-- 4. Run the security checklist in the README before going live.
-- ============================================================

-- ─── Allow doctors to manage staff via the app ────────────────────────────────
-- Doctors need to invite users and assign roles without going into Supabase.
-- The server-side admin client handles this securely.
-- No additional schema changes needed — the app uses the service role key
-- to call auth.admin.createUser() and insert into user_roles.

-- ─── New patient form fields (run if upgrading from earlier version) ──────────
alter table patient_submissions
  add column if not exists recent_back_pain           text,
  add column if not exists first_menstrual_age        text,
  add column if not exists last_menstrual_age         text,
  add column if not exists menstrual_interruptions_yn text,
  add column if not exists menstrual_interruptions    jsonb default '[]'::jsonb;

-- Remove id_number as required field (doctor adds this later)
-- The column stays for backwards compatibility but is no longer required on insert
-- If migrating: alter table patient_submissions alter column id_number drop not null;