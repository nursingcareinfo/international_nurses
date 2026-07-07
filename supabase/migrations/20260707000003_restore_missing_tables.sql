-- Minimal restore: recreate only the tables that are missing on live DB
-- Safe to run from Supabase SQL Editor because it only creates absent objects.
-- Existing tables: nursing_applications, pnc_license_data, survey_answers

-- 0b. SURVEY RESPONSES TABLE
CREATE TABLE IF NOT EXISTS public.survey_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id integer REFERENCES public.nursing_applications(id) ON DELETE CASCADE,
    survey_data jsonb DEFAULT '{}'::jsonb,
    extracted_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.survey_responses IS 'Full placement survey questionnaire responses linked to nursing applications.';

-- 1. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id integer REFERENCES public.nursing_applications(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    email text,
    phone text,
    address text,
    languages text,
    education text,
    experience text,
    skills text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.user_profiles IS 'Normalized profiles of candidates containing parsed resume and education credentials.';

-- RLS for restored tables
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pnc_license_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public anonymous inserts into user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow public anonymous inserts into pnc_license_data" ON public.pnc_license_data;
DROP POLICY IF EXISTS "Allow authenticated select to user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated select to pnc_license_data" ON public.pnc_license_data;

CREATE POLICY "Allow public anonymous inserts into user_profiles"
ON public.user_profiles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public anonymous inserts into pnc_license_data"
ON public.pnc_license_data
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow authenticated select to user_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated select to pnc_license_data"
ON public.pnc_license_data
FOR SELECT
TO authenticated
USING (true);

-- Restore recruiter view so reporting works again
CREATE OR REPLACE VIEW public.recruiter_dashboard_view
WITH (security_invoker = on)
AS
SELECT
    na.id AS application_id,
    na.full_name,
    na.email,
    na.phone,
    na.license_number AS main_license_number,
    pld.category AS license_category,
    pld.verification_status,
    pld.expiry_date AS license_expiry_date,
    sr.survey_data->>'preferredDestination' AS preferred_destination,
    sr.survey_data->>'ieltsStatus' AS english_test_status,
    na.created_at AS submitted_at
FROM public.nursing_applications na
LEFT JOIN public.pnc_license_data pld ON na.id = pld.application_id
LEFT JOIN public.survey_responses sr ON na.id = sr.application_id;

COMMENT ON VIEW public.recruiter_dashboard_view IS 'Recruiter-centric overview combining registration details, credentials status, and placement desires.';
