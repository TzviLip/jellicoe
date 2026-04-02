# DXA Bone Density App

## One-time setup (do this once, never again)

### 1. Create a Supabase project
Go to supabase.com → New project.

### 2. Run the database schema
Open `supabase-schema-COMPLETE.sql` → copy the entire file →
Supabase dashboard → SQL Editor → New query → paste → Run.

This is the only time you ever need to use the Supabase SQL Editor.

### 3. Set up environment variables
```bash
cp .env.local.template .env.local
```
Fill in: Supabase URL + keys, Resend API key, Anthropic API key.

### 4. Create the first doctor account manually
Because someone has to be the first admin, the very first doctor account
must be created in Supabase → Authentication → Users → Add user.
Then assign their role in SQL Editor (one time only):
```sql
insert into user_roles (user_id, role, name) values
  ('paste-uuid-here', 'doctor', 'Dr Smith');
```

After this, all future staff management is done inside the app
via Settings → Staff accounts.

### 5. Deploy to Vercel
```bash
vercel --prod
```
Set all environment variables in the Vercel dashboard.
Update `NEXT_PUBLIC_APP_URL` to your live domain.

---

## After deployment — app-managed setup

Everything below is done inside the app. No Supabase access needed.

1. Log in as the first doctor → go to Settings
2. **Staff accounts** — invite radiographers and additional doctors by email.
   They receive a password setup email automatically.
3. **Letterhead** — fill in practice name, address, phone, etc.
4. **Doctor signatures** — add each doctor's name and registration number,
   then each doctor clicks "This is me" next to their own entry.
5. **Email notifications** — add radiographer emails for patient form alerts.
   Doctor notifications are automatic based on linked accounts.

---

## Routes

| Route | Who | What |
|-------|-----|-------|
| `/form` | Patient | Public intake form |
| `/login` | Staff | Shared login |
| `/radiographer` | Radiographer | Patient inbox |
| `/radiographer/patients/[id]` | Radiographer | Enter DXA data |
| `/doctor` | Doctor | Report inbox |
| `/doctor/patients/[id]` | Doctor | Edit and finalise report |
| `/admin` | Doctor | Settings + staff management |

---

## Security checklist (run after deployment)

1. Visit `https://yourdomain.com/.env` → must return 404
2. Incognito window → try `/doctor` → must redirect to `/login`
3. Go to securityheaders.com → enter your domain → should score A
4. Supabase → Table Editor → confirm RLS is ON for all tables
5. Enable MFA for all staff in Supabase → Authentication → Users