-- ============================================================
-- HOME NURSING SURVEY — EVALUATION QUERIES (SQL Editor)
-- All answers are normalized in survey_answers; identity in
-- nursing_applications. Use these for 1000+ nurse evaluation.
-- ============================================================

-- 1. ALL ANSWERS (one row per nurse, one column per question)
--    Use "Download as CSV" in SQL Editor for the full export.
select * from public.survey_answers_flat
order by submitted_at desc;

-- 2. FILTER BY NAME (fast — uses trigram index on full_name)
--    Iraj + Amir example:
select * from public.survey_answers_flat
where full_name ilike '%iraj%'
   or full_name ilike '%amir%'
order by submitted_at desc;

-- 3. SINGLE NAME
select * from public.survey_answers_flat
where full_name ilike '%iraj%';

-- 4. AGGREGATE — qualification breakdown across all nurses
select professional_qualification, count(*) as nurses
from public.survey_answers
group by professional_qualification
order by nurses desc;

-- 5. AGGREGATE — how many would transition to home nursing
select transition_consideration, count(*) as nurses
from public.survey_answers
group by transition_consideration
order by nurses desc;

-- 6. AGGREGATE — top feature priorities (array-unnest)
select priority, count(*) as votes
from public.survey_answers, unnest(feature_priorities) as priority
group by priority
order by votes desc;

-- 7. FOLLOW-UP CONSENT LIST (nurses open to interview)
select full_name, email, phone
from public.survey_answers_flat
where follow_up_consent ilike '%yes%'
order by submitted_at desc;
