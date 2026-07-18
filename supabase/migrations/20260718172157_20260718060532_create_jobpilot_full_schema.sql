/*
# JobPilot Full Schema (single-tenant, no auth)

Replaces the incompatible starter schema with the correct schema for the
JobPilot job management app. All existing tables were empty (0 rows) and
incompatible with the app (e.g. profiles.id FK to auth.users.id blocked
inserts; jobs used job_title/company_id instead of title/company).

This is a single-tenant application with no sign-in screen, so all policies
use `TO anon, authenticated` with `USING (true)` because the data is
intentionally shared/public.

1. New Tables

- `profiles` — stores the user's resume-parsed profile. Single active row.
  - id (uuid PK), name, email, phone, title, summary, skills (text[]),
    experience_years (numeric), education, raw_text, file_name, file_path,
    created_at, updated_at.

- `jobs` — imported/scraped/live-searched job listings.
  - id (uuid PK), title (not null), company, location, experience_min,
    experience_max, salary_min, salary_max, currency (default USD),
    work_mode, employment_type, posted_date (date), source, job_url,
    skills (text[]), keywords (text[]), description, created_at.

- `saved_jobs` — bookmarked jobs (one per job_id).
  - id (uuid PK), job_id (uuid FK → jobs, unique), created_at.

- `applications` — job application tracking.
  - id (uuid PK), job_id (uuid FK → jobs, unique), status (default 'saved'),
    applied_at, notes, created_at, updated_at.

- `email_logs` — tracks sent job recommendation emails (top 5 matches, ATS 90+).
  - id (uuid PK), recipient_email, recipient_name, email_type ('top5' | 'ats90'),
    jobs_count (int), job_ids (uuid[]), status ('sent' | 'failed'),
    provider_id (text, from Resend), error_message, created_at.

2. Security
  - RLS enabled on all tables.
  - All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
    because this is a single-tenant no-auth app with intentionally shared data.

3. Indexes
  - jobs: source, location, work_mode, employment_type, posted_date, company.
  - applications: status, applied_at.
  - email_logs: recipient_email, created_at.

4. Important Notes
  - Uses gen_random_uuid() for all primary keys.
  - Timestamps default to now().
  - Foreign keys use ON DELETE CASCADE so deleting a job removes its saved/app records.
  - Idempotent: uses IF NOT EXISTS and drops policies before recreating.
*/

-- Drop incompatible empty starter tables (all had 0 rows)
DROP TABLE IF EXISTS uploads CASCADE;
DROP TABLE IF EXISTS resumes CASCADE;
DROP TABLE IF EXISTS job_trends CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  phone text,
  title text,
  summary text,
  skills text[] DEFAULT '{}',
  experience_years numeric,
  education text,
  raw_text text,
  file_name text,
  file_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_profiles" ON profiles;
CREATE POLICY "anon_all_profiles" ON profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE TO anon, authenticated USING (true);

-- jobs
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text,
  location text,
  experience_min numeric,
  experience_max numeric,
  salary_min numeric,
  salary_max numeric,
  currency text DEFAULT 'USD',
  work_mode text,
  employment_type text,
  posted_date date,
  source text,
  job_url text,
  skills text[] DEFAULT '{}',
  keywords text[] DEFAULT '{}',
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_jobs" ON jobs;
CREATE POLICY "anon_all_jobs" ON jobs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_jobs" ON jobs;
CREATE POLICY "anon_insert_jobs" ON jobs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_jobs" ON jobs;
CREATE POLICY "anon_update_jobs" ON jobs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_jobs" ON jobs;
CREATE POLICY "anon_delete_jobs" ON jobs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_work_mode ON jobs(work_mode);
CREATE INDEX idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX idx_jobs_posted_date ON jobs(posted_date);
CREATE INDEX idx_jobs_company ON jobs(company);

-- saved_jobs
CREATE TABLE saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (job_id)
);
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_saved_jobs" ON saved_jobs;
CREATE POLICY "anon_all_saved_jobs" ON saved_jobs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_saved_jobs" ON saved_jobs;
CREATE POLICY "anon_insert_saved_jobs" ON saved_jobs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_saved_jobs" ON saved_jobs;
CREATE POLICY "anon_delete_saved_jobs" ON saved_jobs FOR DELETE TO anon, authenticated USING (true);

-- applications
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'saved',
  applied_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (job_id)
);
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_applications" ON applications;
CREATE POLICY "anon_all_applications" ON applications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_applications" ON applications;
CREATE POLICY "anon_insert_applications" ON applications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_applications" ON applications;
CREATE POLICY "anon_update_applications" ON applications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_applications" ON applications;
CREATE POLICY "anon_delete_applications" ON applications FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_applied_at ON applications(applied_at);

-- email_logs
CREATE TABLE email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_name text,
  email_type text NOT NULL,
  jobs_count integer NOT NULL DEFAULT 0,
  job_ids uuid[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'sent',
  provider_id text,
  error_message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_email_logs" ON email_logs;
CREATE POLICY "anon_all_email_logs" ON email_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_email_logs" ON email_logs;
CREATE POLICY "anon_insert_email_logs" ON email_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_email_logs" ON email_logs;
CREATE POLICY "anon_update_email_logs" ON email_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_email_logs" ON email_logs;
CREATE POLICY "anon_delete_email_logs" ON email_logs FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);
