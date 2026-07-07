-- Fix recruiter_dashboard_view to use SECURITY INVOKER
-- so RLS policies of the calling user are respected,
-- matching the pattern already used by survey_answers_flat.
-- See: https://postgresql.org/docs/current/sql-createview.html

alter view public.recruiter_dashboard_view set (security_invoker = on);
