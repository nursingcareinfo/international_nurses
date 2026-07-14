-- Add age, gender, religion columns to user_profiles for complete CV data storage

alter table if exists public.user_profiles
  add column if not exists age text,
  add column if not exists gender text,
  add column if not exists religion text;

comment on column public.user_profiles.age is 'Extracted age of the nurse candidate from CV';
comment on column public.user_profiles.gender is 'Extracted gender of the nurse candidate from CV';
comment on column public.user_profiles.religion is 'Extracted religion of the nurse candidate from CV';
