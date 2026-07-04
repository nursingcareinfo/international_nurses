-- Supabase Database Migration File
-- Generated on: 2026-07-04 (Coordinated Universal Time)
-- Title: Define New Tables for user_profiles and pnc_license_data (integrating with existing nursing_applications)

-- Create extension for UUID generation if it does not already exist
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. USER PROFILES TABLE (Candidate Profiles)
-- ==========================================
create table if not exists public.user_profiles (
    id uuid primary key default gen_random_uuid(),
    application_id integer references public.nursing_applications(id) on delete cascade,
    full_name text not null,
    email text,
    phone text,
    address text,
    languages text,
    education text,
    experience text,
    skills text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.user_profiles is 'Normalized profiles of candidates containing parsed resume and education credentials.';

-- ==========================================
-- 2. PNC LICENSE DATA TABLE (PNC Smart Credentials)
-- ==========================================
create table if not exists public.pnc_license_data (
    id uuid primary key default gen_random_uuid(),
    application_id integer references public.nursing_applications(id) on delete cascade,
    license_number text not null,
    council_name text default 'Pakistan Nursing Council',
    category text,
    verification_status text default 'Active',
    issue_date date,
    expiry_date date,
    additional_qualifications text,
    nursing_school text,
    graduation_year integer,
    pnc_card_present text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.pnc_license_data is 'Specialized credential database for Pakistan Nursing Council (PNC) physical and smart cards.';
comment on column public.pnc_license_data.license_number is 'Alphanumeric registration card identifier (e.g. PM-10-A-12345, G-98765, etc.).';
comment on column public.pnc_license_data.expiry_date is 'Parsed valid-to / expiry date of the physical card.';

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL
-- ==========================================
alter table public.user_profiles enable row level security;
alter table public.pnc_license_data enable row level security;

-- Drop existing policies if they exist to avoid migration errors
drop policy if exists "Allow public anonymous inserts into user_profiles" on public.user_profiles;
drop policy if exists "Allow public anonymous inserts into pnc_license_data" on public.pnc_license_data;
drop policy if exists "Allow authenticated select to user_profiles" on public.user_profiles;
drop policy if exists "Allow authenticated select to pnc_license_data" on public.pnc_license_data;

-- Policies for public insertions (allowing anonymous portal submissions)
create policy "Allow public anonymous inserts into user_profiles" 
on public.user_profiles for insert 
with check (true);

create policy "Allow public anonymous inserts into pnc_license_data" 
on public.pnc_license_data for insert 
with check (true);

-- Policies for recruiter read operations (requires authenticated session)
create policy "Allow authenticated select to user_profiles" 
on public.user_profiles for select 
to authenticated 
using (true);

create policy "Allow authenticated select to pnc_license_data" 
on public.pnc_license_data for select 
to authenticated 
using (true);

-- ==========================================
-- 4. ANALYTICS & RECRUITER REPORTING VIEWS
-- ==========================================
create or replace view public.recruiter_dashboard_view as
select 
    na.id as application_id,
    na.full_name,
    na.email,
    na.phone,
    na.license_number as main_license_number,
    pld.category as license_category,
    pld.verification_status,
    pld.expiry_date as license_expiry_date,
    sr.survey_data->>'preferredDestination' as preferred_destination,
    sr.survey_data->>'ieltsStatus' as english_test_status,
    na.created_at as submitted_at
from public.nursing_applications na
left join public.pnc_license_data pld on na.id = pld.application_id  -- safe fallback join
left join public.survey_responses sr on na.id = sr.application_id;

comment on view public.recruiter_dashboard_view is 'Recruiter-centric overview combining registration details, credentials status, and placement desires.';
