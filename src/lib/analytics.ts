const SESSION_KEY = "analytics_session_id";
const PLATFORM_KEY = "analytics_platform";

function getSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function getUtmParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  if (utm.utm_source && !sessionStorage.getItem(PLATFORM_KEY)) {
    sessionStorage.setItem(PLATFORM_KEY, utm.utm_source);
  }
  return utm;
}

function getPlatform(): string | null {
  return sessionStorage.getItem(PLATFORM_KEY);
}

export async function track(
  eventName: string,
  extra: Record<string, any> = {}
): Promise<void> {
  const utm = getUtmParams();
  const payload = {
    event_name: eventName,
    platform: extra.platform || getPlatform() || null,
    referrer: document.referrer || null,
    page: window.location.pathname,
    utm_source: utm.utm_source || null,
    utm_medium: utm.utm_medium || null,
    utm_campaign: utm.utm_campaign || null,
    session_id: getSessionId(),
    survey_id: extra.survey_id || null,
  };

  try {
    const env = (import.meta as any).env;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (supabaseUrl && supabaseKey && supabaseKey !== "YOUR_SUPABASE_ANON_KEY") {
      const url = `${supabaseUrl}/functions/v1/analytics-track`;
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(payload),
      });
      return;
    }

    await fetch("/api/analytics-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // analytics failures are non-critical
  }
}

export function initAnalytics(): void {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem("analytics_inited")) return;
  sessionStorage.setItem("analytics_inited", "1");

  track("page_view");
}
