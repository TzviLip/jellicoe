-- ============================================================
-- Phase 4 additions — run in Supabase SQL Editor
-- ============================================================

-- Practice / letterhead settings (single row, updated in place)
create table if not exists practice_settings (
  id              uuid primary key default gen_random_uuid(),
  updated_at      timestamptz default now(),

  -- Letterhead
  practice_name   text default 'Bone Density & Osteoporosis Clinic',
  practice_sub    text default 'Subspecialist in Osteoporosis & Bone Health',
  practice_address text default '',
  practice_phone  text default '',
  practice_email  text default '',
  practice_number text default '',

  -- Doctor signatures (up to 2)
  doctor1_name    text default '',
  doctor1_number  text default '',
  doctor2_name    text default '',
  doctor2_number  text default ''
);

-- Seed one row
insert into practice_settings (id) values (gen_random_uuid())
on conflict do nothing;

-- RLS
alter table practice_settings enable row level security;

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

-- ─── Add report_status column (run after existing schema) ─────────────────────
alter table patient_submissions
  add column if not exists report_status text default 'pending'
  check (report_status in ('pending', 'generating', 'ready', 'failed'));

-- Seed patient_submitted event in notification_config (fixes radiographer email)
insert into notification_config (event, recipient_emails) values
  ('patient_submitted', array['radiographer@yourpractice.com'])
on conflict (event) do nothing;

-- ─── Tighten user_roles: block self-modification ──────────────────────────────
-- Without this, an authenticated user could set their own role to 'doctor'

drop policy if exists "Admins can manage roles" on user_roles;

-- Only the service role (server-side admin client) can insert/update/delete roles
-- No client-side policy = blocked for all browser requests
-- Roles are only assigned via SQL Editor or server-side admin client

-- Users can still read their own role (for routing after login)
-- That policy already exists — leave it in place
