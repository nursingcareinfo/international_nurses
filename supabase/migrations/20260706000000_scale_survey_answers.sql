-- Supabase Database Migration File
-- Generated on: 2026-07-06
-- Title: Scale survey answers to 1000+ nurses — normalized answers table, evaluation view, indexes, RLS hardening

-- ==========================================
-- 0. EXTENSIONS
-- ==========================================
create extension if not exists "pg_trgm";

-- ==========================================
-- 1. NORMALIZED SURVEY ANSWERS TABLE
-- ==========================================
create table if not exists public.survey_answers (
    application_id integer primary key references public.nursing_applications(id) on delete cascade,

    -- Background
    vehicle_transport text,
    professional_qualification text,
    specialization text[],
    total_years_experience text,
    home_care_experience text,
    institute_name text,
    employment_status text,

    -- Availability
    monthly_income text,
    supplemental_income text,
    expected_shift_pay text,
    weekly_availability text,
    available_shifts text[],
    travel_willingness text,

    -- Preferences
    transition_consideration text,
    preferred_patient_types text[],
    comfort_working_alone text,

    -- Challenges
    challenges_experienced text[],
    biggest_fears text[],
    safer_with_platform text,
    describe_incident text,

    -- Platform
    aware_of_platform text,
    find_work_method text[],
    market_viability text,
    feature_priorities text[],
    would_recommend text,
    additional_comments text,
    follow_up_consent text,

    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.survey_answers is 'Normalized home-nursing survey responses, one column per question, for scalable evaluation at 1000+ respondents.';

-- ==========================================
-- 2. INDEXES (scale: fast name filter + time range)
-- ==========================================
-- Trigram index enables fast ILIKE '%iraj%' / '%amir%' at 1000+ rows
create index if not exists idx_nursing_applications_full_name_trgm
    on public.nursing_applications using gin (full_name gin_trgm_ops);

create index if not exists idx_survey_answers_created_at
    on public.survey_answers (created_at desc);

create index if not exists idx_nursing_applications_created_at
    on public.nursing_applications (created_at desc);

-- ==========================================
-- 3. EVALUATION VIEW (one row per nurse, SQL Editor friendly)
-- ==========================================
create or replace view public.survey_answers_flat as
select
    na.id as application_id,
    na.full_name,
    na.email,
    na.phone,
    na.license_number,
    na.created_at as submitted_at,
    sa.vehicle_transport,
    sa.professional_qualification,
    sa.specialization,
    sa.total_years_experience,
    sa.home_care_experience,
    sa.institute_name,
    sa.employment_status,
    sa.monthly_income,
    sa.supplemental_income,
    sa.expected_shift_pay,
    sa.weekly_availability,
    sa.available_shifts,
    sa.travel_willingness,
    sa.transition_consideration,
    sa.preferred_patient_types,
    sa.comfort_working_alone,
    sa.challenges_experienced,
    sa.biggest_fears,
    sa.safer_with_platform,
    sa.describe_incident,
    sa.aware_of_platform,
    sa.find_work_method,
    sa.market_viability,
    sa.feature_priorities,
    sa.would_recommend,
    sa.additional_comments,
    sa.follow_up_consent
from public.nursing_applications na
left join public.survey_answers sa on na.id = sa.application_id;

comment on view public.survey_answers_flat is 'Flat per-nurse evaluation view joining identity + normalized answers. Use in SQL Editor for filtering/aggregation at scale.';

-- ==========================================
-- 4. RLS HARDENING (stop PII leak; anon write, authenticated/service read)
-- ==========================================
alter table public.nursing_applications enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_answers enable row level security;

drop policy if exists "Allow public anonymous inserts into nursing_applications" on public.nursing_applications;
drop policy if exists "Allow public anonymous inserts into survey_responses" on public.survey_responses;
drop policy if exists "Allow public anonymous inserts into survey_answers" on public.survey_answers;
drop policy if exists "Allow authenticated select to nursing_applications" on public.nursing_applications;
drop policy if exists "Allow authenticated select to survey_responses" on public.survey_responses;
drop policy if exists "Allow authenticated select to survey_answers" on public.survey_answers;
drop policy if exists "Allow service role full access to nursing_applications" on public.nursing_applications;
drop policy if exists "Allow service role full access to survey_responses" on public.survey_responses;
drop policy if exists "Allow service role full access to survey_answers" on public.survey_answers;

-- Anon may INSERT (portal submissions) but NOT read
create policy "Allow public anonymous inserts into nursing_applications"
    on public.nursing_applications for insert with check (true);

create policy "Allow public anonymous inserts into survey_responses"
    on public.survey_responses for insert with check (true);

create policy "Allow public anonymous inserts into survey_answers"
    on public.survey_answers for insert with check (true);

-- Authenticated users (and service role, which bypasses RLS) may SELECT
create policy "Allow authenticated select to nursing_applications"
    on public.nursing_applications for select to authenticated using (true);

create policy "Allow authenticated select to survey_responses"
    on public.survey_responses for select to authenticated using (true);

create policy "Allow authenticated select to survey_answers"
    on public.survey_answers for select to authenticated using (true);

-- ==========================================
-- 5. BACKFILL (one-time: existing survey_data jsonb -> normalized columns)
-- ==========================================
insert into public.survey_answers (
    application_id,
    vehicle_transport,
    professional_qualification,
    specialization,
    total_years_experience,
    home_care_experience,
    institute_name,
    employment_status,
    monthly_income,
    supplemental_income,
    expected_shift_pay,
    weekly_availability,
    available_shifts,
    travel_willingness,
    transition_consideration,
    preferred_patient_types,
    comfort_working_alone,
    challenges_experienced,
    biggest_fears,
    safer_with_platform,
    describe_incident,
    aware_of_platform,
    find_work_method,
    market_viability,
    feature_priorities,
    would_recommend,
    additional_comments,
    follow_up_consent,
    created_at
)
select
    sr.application_id,
    sr.survey_data->>'vehicleTransport',
    sr.survey_data->>'professionalQualification',
    case
        when jsonb_typeof(sr.survey_data->'specialization') = 'array'
        then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'specialization'))
        else null
    end,
    sr.survey_data->>'totalYearsExperience',
    sr.survey_data->>'homeCareExperience',
    sr.survey_data->>'instituteName',
    sr.survey_data->>'employmentStatus',
    sr.survey_data->>'monthlyIncome',
    sr.survey_data->>'supplementalIncome',
    sr.survey_data->>'expectedShiftPay',
    sr.survey_data->>'weeklyAvailability',
    case
        when jsonb_typeof(sr.survey_data->'availableShifts') = 'array'
        then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'availableShifts'))
        else null
    end,
    sr.survey_data->>'travelWillingness',
    sr.survey_data->>'transitionConsideration',
    case
        when jsonb_typeof(sr.survey_data->'preferredPatientTypes') = 'array'
        then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'preferredPatientTypes'))
        else null
    end,
    sr.survey_data->>'comfortWorkingAlone',
    case
        when jsonb_typeof(sr.survey_data->'challengesExperienced') = 'array'
        then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'challengesExperienced'))
        else null
    end,
    case
        when jsonb_typeof(sr.survey_data->'biggestFears') = 'array'
        then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'biggestFears'))
        else null
    end,
    sr.survey_data->>'saferWithPlatform',
    sr.survey_data->>'describeIncident',
    sr.survey_data->>'awareOfPlatform',
    case
        when jsonb_typeof(sr.survey_data->'findWorkMethod') = 'array'
        then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'findWorkMethod'))
        else null
    end,
    sr.survey_data->>'marketViability',
    case
        when jsonb_typeof(sr.survey_data->'featurePriorities') = 'array'
        then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'featurePriorities'))
        else null
    end,
    sr.survey_data->>'wouldRecommend',
    sr.survey_data->>'additionalComments',
    sr.survey_data->>'followUpConsent',
    sr.created_at
from public.survey_responses sr
where not exists (
    select 1 from public.survey_answers sa where sa.application_id = sr.application_id
)
on conflict (application_id) do nothing;
