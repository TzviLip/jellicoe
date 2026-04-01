# DXA Bone Density App — Phase 3 (complete)

## Quick start

```bash
npm install
npm run dev
```

---

## One-time setup

### 1. Supabase
- Go to supabase.com → New project
- Paste `supabase-schema.sql` into SQL Editor → Run

### 2. Environment variables
```bash
cp .env.local.template .env.local
```
Fill in all values (Supabase keys, Resend key, Anthropic key, emails).

### 3. Create staff accounts in Supabase
Authentication → Users → Add user → create radiographer + 2 doctors.

### 4. Assign roles (SQL Editor)
```sql
insert into user_roles (user_id, role, name) values
  ('radiographer-uuid', 'radiographer', 'Radiographer Name'),
  ('doctor1-uuid',      'doctor',       'Dr Smith'),
  ('doctor2-uuid',      'doctor',       'Dr Jones');
```

### 5. Configure doctor notification emails (SQL Editor)
```sql
update notification_config
set recipient_emails = array['dr.smith@practice.com', 'dr.jones@practice.com']
where event = 'radiographer_submitted';
```

### 6. Add practice details to letterhead
Open `app/api/doctor/download/route.ts` — update the letterhead section
with the practice name, address, phone, and doctor names.

---

## Full workflow

```
Patient  →  /form          →  submits  →  email to radiographer
Radiographer  →  /radiographer  →  picks patient  →  enters DXA data  →  submits
                                                  →  AI generates report (background)
                                                  →  email to doctors
Doctor  →  /doctor  →  opens report  →  edits in browser  →  adds commentary
        →  Download .docx  OR  Email to recipient
```

---

## Routes

| Route | Role | What |
|-------|------|------|
| `/form` | Patient | Public form, no login |
| `/login` | Staff | Shared login |
| `/radiographer` | Radiographer | Patient inbox |
| `/radiographer/patients/[id]` | Radiographer | DXA data entry |
| `/doctor` | Doctor | Report inbox |
| `/doctor/patients/[id]` | Doctor | In-browser editor + download/email |

---

## Key files

```
app/
  form/page.tsx                        Patient form (all 9 steps)
  login/page.tsx                       Staff login
  radiographer/page.tsx                Radiographer inbox
  radiographer/patients/[id]/page.tsx  DXA data entry form
  doctor/page.tsx                      Doctor inbox
  doctor/patients/[id]/page.tsx        Report editor
  api/
    submit/route.ts                    Patient → Supabase + email radiographer
    radiographer/submit/route.ts       DXA data → Supabase + trigger AI + email doctors
    generate-report/route.ts           Claude API → draft report HTML
    doctor/save/route.ts               Save doctor edits
    doctor/finalise/route.ts           Mark complete
    doctor/download/route.ts           HTML → docx download
    doctor/email/route.ts              docx → Resend email attachment

lib/supabase.ts                        Supabase client helpers
middleware.ts                          Route protection
supabase-schema.sql                    Run once in Supabase
.env.local.template                    Copy → .env.local
```

---

## Security checklist — run after every deployment

These are the exact checks from the post about vibe-coded app vulnerabilities.
Run all of these before any real patient data enters the system.

### 1. RLS enabled on every table
In Supabase → Table Editor, confirm the RLS toggle is ON for:
- patient_submissions
- user_roles
- notification_config
- audit_log
- practice_settings

### 2. No secret keys in the browser bundle
Open your deployed app → F12 → Sources → Ctrl+F and search for each:
- `service_role` → must return NO results
- `sk-ant-` → must return NO results  
- `RESEND_API_KEY` → must return NO results
- `SUPABASE_SERVICE_KEY` → must return NO results

Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are
intentionally public and safe to expose.

### 3. .env file is not publicly accessible
Visit these URLs — both must return 404:
- `https://yourdomain.com/.env`
- `https://yourdomain.com/.env.local`
- `https://yourdomain.com/.git/HEAD`

### 4. Protected routes block unauthenticated access
In an incognito window (not logged in), try visiting:
- `https://yourdomain.com/doctor` → must redirect to /login
- `https://yourdomain.com/radiographer` → must redirect to /login
- `https://yourdomain.com/admin` → must redirect to /login

### 5. Security headers are present
Visit https://securityheaders.com and enter your domain.
You should score at least a B. The headers set in next.config.js give an A.

### 6. Nobody can self-assign a role
In Supabase → SQL Editor, run:
```sql
select tablename, policyname, cmd 
from pg_policies 
where tablename = 'user_roles';
```
You should see ONLY a SELECT policy ("Users can read their own role").
There must be NO INSERT, UPDATE, or DELETE policies on user_roles.
Roles are assigned only via SQL Editor directly.

### 7. MFA enabled for all staff
In Supabase → Authentication → Users, confirm MFA is configured
for the radiographer and both doctor accounts.
