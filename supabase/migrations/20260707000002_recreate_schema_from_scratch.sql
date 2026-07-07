-- ==========================================
-- Full schema reset/recreation migration
-- Safe to run from Supabase SQL editor.
-- Uses IF EXISTS / DROP to avoid duplicate-object errors.
-- ==========================================

-- 1. Drop dependent views first
DROP VIEW IF EXISTS public.survey_answers_flat;
DROP VIEW IF EXISTS public.recruiter_dashboard_view;

-- 2. Drop tables in dependency-safe order
DROP TABLE IF EXISTS public.survey_answers;
DROP TABLE IF EXISTS public.survey_responses;
DROP TABLE IF EXISTS public.user_profiles;
DROP TABLE IF EXISTS public.pnc_license_data;
DROP TABLE IF EXISTS public.nursing_applications;

-- ==========================================
-- Tables
-- ==========================================

-- 0. NURSING APPLICATIONS TABLE (Core Submissions)
CREATE TABLE public.nursing_applications (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    full_name text NOT NULL,
    email text,
    phone text,
    license_number text,
    ai_extracted_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    survey_link_sent boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.nursing_applications IS 'Core application submissions from nurse candidates containing parsed resume data and PNC credentials.';

-- 0b. SURVEY RESPONSES TABLE (Questionnaire Answers)
CREATE TABLE public.survey_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id integer REFERENCES public.nursing_applications(id) ON DELETE CASCADE,
    survey_data jsonb DEFAULT '{}'::jsonb,
    extracted_data jsonb DEFAULT '{}'::jsonb,
    submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.survey_responses IS 'Full placement survey questionnaire responses linked to nursing applications.';

-- 1. NORMALIZED SURVEY ANSWERS TABLE
CREATE TABLE public.survey_answers (
    application_id integer PRIMARY KEY REFERENCES public.nursing_applications(id) ON DELETE CASCADE,
    vehicle_transport text,
    professional_qualification text,
    specialization text[],
    total_years_experience text,
    home_care_experience text,
    institute_name text,
    employment_status text,
    monthly_income text,
    supplemental_income text,
    expected_shift_pay text,
    weekly_availability text,
    available_shifts text[],
    travel_willingness text,
    transition_consideration text,
    preferred_patient_types text[],
    comfort_working_alone text,
    challenges_experienced text[],
    biggest_fears text[],
    safer_with_platform text,
    describe_incident text,
    aware_of_platform text,
    find_work_method text[],
    market_viability text,
    feature_priorities text[],
    would_recommend text,
    additional_comments text,
    follow_up_consent text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.survey_answers IS 'Normalized home-nursing survey responses, one column per question, for scalable evaluation at 1000+ respondents.';

-- 2. USER PROFILES TABLE (Candidate Profiles)
CREATE TABLE public.user_profiles (
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

-- 3. PNC LICENSE DATA TABLE (PNC Smart Credentials)
CREATE TABLE public.pnc_license_data (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id integer REFERENCES public.nursing_applications(id) ON DELETE CASCADE,
    license_number text NOT NULL,
    council_name text DEFAULT 'Pakistan Nursing Council',
    category text,
    verification_status text DEFAULT 'Active',
    issue_date date,
    expiry_date date,
    additional_qualifications text,
    nursing_school text,
    graduation_year integer,
    pnc_card_present text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.pnc_license_data IS 'Specialized credential database for Pakistan Nursing Council (PNC) physical and smart cards.';
COMMENT ON COLUMN public.pnc_license_data.license_number IS 'Alphanumeric registration card identifier (e.g. PM-10-A-12345, G-98765, etc.).';
COMMENT ON COLUMN public.pnc_license_data.expiry_date IS 'Parsed valid-to / expiry date of the physical card.';

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS nursing_applications_created_at_desc ON public.nursing_applications USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS nursing_applications_full_name_trgm_gin ON public.nursing_applications USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS survey_answers_created_at_desc ON public.survey_answers USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS survey_responses_submitted_at_desc ON public.survey_responses USING btree (submitted_at DESC);

-- ==========================================
-- RLS
-- ==========================================
ALTER TABLE public.nursing_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnc_license_data ENABLE ROW LEVEL SECURITY;

-- nursing_applications
DROP POLICY IF EXISTS "Allow public anonymous inserts into nursing_applications" ON public.nursing_applications;
DROP POLICY IF EXISTS "Allow authenticated select to nursing_applications" ON public.nursing_applications;

CREATE POLICY "Allow public anonymous inserts into nursing_applications"
    ON public.nursing_applications FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated select to nursing_applications"
    ON public.nursing_applications FOR SELECT TO authenticated USING (true);

-- survey_responses
DROP POLICY IF EXISTS "Allow public anonymous inserts into survey_responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Allow authenticated select to survey_responses" ON public.survey_responses;

CREATE POLICY "Allow public anonymous inserts into survey_responses"
    ON public.survey_responses FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated select to survey_responses"
    ON public.survey_responses FOR SELECT TO authenticated USING (true);

-- survey_answers
DROP POLICY IF EXISTS "Allow public anonymous inserts into survey_answers" ON public.survey_answers;
DROP POLICY IF EXISTS "Allow authenticated select to survey_answers" ON public.survey_answers;

CREATE POLICY "Allow public anonymous inserts into survey_answers"
    ON public.survey_answers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated select to survey_answers"
    ON public.survey_answers FOR SELECT TO authenticated USING (true);

-- user_profiles
DROP POLICY IF EXISTS "Allow public anonymous inserts into user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated select to user_profiles" ON public.user_profiles;

CREATE POLICY "Allow public anonymous inserts into user_profiles"
    ON public.user_profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated select to user_profiles"
    ON public.user_profiles FOR SELECT TO authenticated USING (true);

-- pnc_license_data
DROP POLICY IF EXISTS "Allow public anonymous inserts into pnc_license_data" ON public.pnc_license_data;
DROP POLICY IF EXISTS "Allow authenticated select to pnc_license_data" ON public.pnc_license_data;

CREATE POLICY "Allow public anonymous inserts into pnc_license_data"
    ON public.pnc_license_data FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated select to pnc_license_data"
    ON public.pnc_license_data FOR SELECT TO authenticated USING (true);

-- ==========================================
-- Views
-- ==========================================

CREATE OR REPLACE VIEW public.survey_answers_flat WITH (security_invoker = true) AS
SELECT
    na.id AS application_id,
    na.full_name,
    na.email,
    na.phone,
    na.license_number,
    na.created_at AS submitted_at,
    coalesce(sa.vehicle_transport, sr.survey_data->>'vehicleTransport') AS vehicle_transport,
    coalesce(sa.professional_qualification, sr.survey_data->>'professionalQualification') AS professional_qualification,
    coalesce(sa.specialization,
      CASE WHEN jsonb_typeof(sr.survey_data->'specialization') = 'array'
           THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(sr.survey_data->'specialization'))
           ELSE NULL END) AS specialization,
    coalesce(sa.total_years_experience, sr.survey_data->>'totalYearsExperience') AS total_years_experience,
    coalesce(sa.home_care_experience, sr.survey_data->>'homeCareExperience') AS home_care_experience,
    coalesce(sa.institute_name, sr.survey_data->>'instituteName') AS institute_name,
    coalesce(sa.employment_status, sr.survey_data->>'employmentStatus') AS employment_status,
    coalesce(sa.monthly_income, sr.survey_data->>'monthlyIncome') AS monthly_income,
    coalesce(sa.supplemental_income, sr.survey_data->>'supplementalIncome') AS supplemental_income,
    coalesce(sa.expected_shift_pay, sr.survey_data->>'expectedShiftPay') AS expected_shift_pay,
    coalesce(sa.weekly_availability, sr.survey_data->>'weeklyAvailability') AS weekly_availability,
    coalesce(sa.available_shifts,
      CASE WHEN jsonb_typeof(sr.survey_data->'availableShifts') = 'array'
           THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(sr.survey_data->'availableShifts'))
           ELSE NULL END) AS available_shifts,
    coalesce(sa.travel_willingness, sr.survey_data->>'travelWillingness') AS travel_willingness,
    coalesce(sa.transition_consideration, sr.survey_data->>'transitionConsideration') AS transition_consideration,
    coalesce(sa.preferred_patient_types,
      CASE WHEN jsonb_typeof(sr.survey_data->'preferredPatientTypes') = 'array'
           THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(sr.survey_data->'preferredPatientTypes'))
           ELSE NULL END) AS preferred_patient_types,
    coalesce(sa.comfort_working_alone, sr.survey_data->>'comfortWorkingAlone') AS comfort_working_alone,
    coalesce(sa.challenges_experienced,
      CASE WHEN jsonb_typeof(sr.survey_data->'challengesExperienced') = 'array'
           THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(sr.survey_data->'challengesExperienced'))
           ELSE NULL END) AS challenges_experienced,
    coalesce(sa.biggest_fears,
      CASE WHEN jsonb_typeof(sr.survey_data->'biggestFears') = 'array'
           THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(sr.survey_data->'biggestFears'))
           ELSE NULL END) AS biggest_fears,
    coalesce(sa.safer_with_platform, sr.survey_data->>'saferWithPlatform') AS safer_with_platform,
    coalesce(sa.describe_incident, sr.survey_data->>'describeIncident') AS describe_incident,
    coalesce(sa.aware_of_platform, sr.survey_data->>'awareOfPlatform') AS aware_of_platform,
    coalesce(sa.find_work_method,
      CASE WHEN jsonb_typeof(sr.survey_data->'findWorkMethod') = 'array'
           THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(sr.survey_data->'findWorkMethod'))
           ELSE NULL END) AS find_work_method,
    coalesce(sa.market_viability, sr.survey_data->>'marketViability') AS market_viability,
    coalesce(sa.feature_priorities,
      CASE WHEN jsonb_typeof(sr.survey_data->'featurePriorities') = 'array'
           THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(sr.survey_data->'featurePriorities'))
           ELSE NULL END) AS feature_priorities,
    coalesce(sa.would_recommend, sr.survey_data->>'wouldRecommend') AS would_recommend,
    coalesce(sa.additional_comments, sr.survey_data->>'additionalComments') AS additional_comments,
    coalesce(sa.follow_up_consent, sr.survey_data->>'followUpConsent') AS follow_up_consent
FROM public.nursing_applications na
LEFT JOIN public.survey_answers sa ON na.id = sa.application_id
LEFT JOIN public.survey_responses sr ON na.id = sr.application_id;

COMMENT ON VIEW public.survey_answers_flat IS 'Flat per-nurse evaluation view joining identity + answers. Prefers normalized survey_answers, falls back to survey_responses.survey_data.';

CREATE OR REPLACE VIEW public.recruiter_dashboard_view WITH (security_invoker = on) AS
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
