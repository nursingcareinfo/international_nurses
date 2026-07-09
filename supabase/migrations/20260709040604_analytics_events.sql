CREATE TABLE public.analytics_events (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    event_name text NOT NULL,
    platform text,
    referrer text,
    page text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    session_id text,
    survey_id integer,
    user_agent text,
    ip_address text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_analytics" ON public.analytics_events
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "auth_select_analytics" ON public.analytics_events
    FOR SELECT
    TO authenticated
    USING (true);
