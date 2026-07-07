-- Migration: make survey_answers_flat resilient to missing normalized rows
-- Falls back to survey_responses.survey_data when survey_answers is not populated yet.
create or replace view public.survey_answers_flat with (security_invoker = true) as
select
    na.id as application_id,
    na.full_name,
    na.email,
    na.phone,
    na.license_number,
    na.created_at as submitted_at,
    coalesce(sa.vehicle_transport, sr.survey_data->>'vehicleTransport') as vehicle_transport,
    coalesce(sa.professional_qualification, sr.survey_data->>'professionalQualification') as professional_qualification,
    coalesce(sa.specialization, 
      case when jsonb_typeof(sr.survey_data->'specialization') = 'array'
           then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'specialization'))
           else null end) as specialization,
    coalesce(sa.total_years_experience, sr.survey_data->>'totalYearsExperience') as total_years_experience,
    coalesce(sa.home_care_experience, sr.survey_data->>'homeCareExperience') as home_care_experience,
    coalesce(sa.institute_name, sr.survey_data->>'instituteName') as institute_name,
    coalesce(sa.employment_status, sr.survey_data->>'employmentStatus') as employment_status,
    coalesce(sa.monthly_income, sr.survey_data->>'monthlyIncome') as monthly_income,
    coalesce(sa.supplemental_income, sr.survey_data->>'supplementalIncome') as supplemental_income,
    coalesce(sa.expected_shift_pay, sr.survey_data->>'expectedShiftPay') as expected_shift_pay,
    coalesce(sa.weekly_availability, sr.survey_data->>'weeklyAvailability') as weekly_availability,
    coalesce(sa.available_shifts,
      case when jsonb_typeof(sr.survey_data->'availableShifts') = 'array'
           then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'availableShifts'))
           else null end) as available_shifts,
    coalesce(sa.travel_willingness, sr.survey_data->>'travelWillingness') as travel_willingness,
    coalesce(sa.transition_consideration, sr.survey_data->>'transitionConsideration') as transition_consideration,
    coalesce(sa.preferred_patient_types,
      case when jsonb_typeof(sr.survey_data->'preferredPatientTypes') = 'array'
           then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'preferredPatientTypes'))
           else null end) as preferred_patient_types,
    coalesce(sa.comfort_working_alone, sr.survey_data->>'comfortWorkingAlone') as comfort_working_alone,
    coalesce(sa.challenges_experienced,
      case when jsonb_typeof(sr.survey_data->'challengesExperienced') = 'array'
           then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'challengesExperienced'))
           else null end) as challenges_experienced,
    coalesce(sa.biggest_fears,
      case when jsonb_typeof(sr.survey_data->'biggestFears') = 'array'
           then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'biggestFears'))
           else null end) as biggest_fears,
    coalesce(sa.safer_with_platform, sr.survey_data->>'saferWithPlatform') as safer_with_platform,
    coalesce(sa.describe_incident, sr.survey_data->>'describeIncident') as describe_incident,
    coalesce(sa.aware_of_platform, sr.survey_data->>'awareOfPlatform') as aware_of_platform,
    coalesce(sa.find_work_method,
      case when jsonb_typeof(sr.survey_data->'findWorkMethod') = 'array'
           then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'findWorkMethod'))
           else null end) as find_work_method,
    coalesce(sa.market_viability, sr.survey_data->>'marketViability') as market_viability,
    coalesce(sa.feature_priorities,
      case when jsonb_typeof(sr.survey_data->'featurePriorities') = 'array'
           then (select array_agg(value::text) from jsonb_array_elements_text(sr.survey_data->'featurePriorities'))
           else null end) as feature_priorities,
    coalesce(sa.would_recommend, sr.survey_data->>'wouldRecommend') as would_recommend,
    coalesce(sa.additional_comments, sr.survey_data->>'additionalComments') as additional_comments,
    coalesce(sa.follow_up_consent, sr.survey_data->>'followUpConsent') as follow_up_consent
from public.nursing_applications na
left join public.survey_answers sa on na.id = sa.application_id
left join public.survey_responses sr on na.id = sr.application_id;

comment on view public.survey_answers_flat is 'Flat per-nurse evaluation view joining identity + answers. Prefers normalized survey_answers, falls back to survey_responses.survey_data.';
