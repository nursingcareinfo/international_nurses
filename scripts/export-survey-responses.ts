import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://ecxohbfvpmdgfiylkxpc.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function exportSurveyResponses() {
  const nameFilter = (process.env.NAME_FILTER || "")
    .split(",")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);

  let appQuery = supabase
    .from("nursing_applications")
    .select("id, full_name, email, phone, license_number, created_at")
    .order("created_at", { ascending: false });

  if (nameFilter.length > 0) {
    const or = nameFilter
      .map((n) => `full_name.ilike.%${n}%`)
      .join(",");
    appQuery = appQuery.or(or);
  }

  const { data: applications, error: appErr } = await appQuery;

  if (appErr) {
    console.error("Failed to fetch applications:", appErr.message);
    process.exit(1);
  }

  const appIds = (applications || []).map((a) => a.id);

  let surveyQuery = supabase
    .from("survey_responses")
    .select("id, application_id, survey_data, extracted_data, created_at")
    .order("created_at", { ascending: false });

  if (appIds.length > 0) {
    surveyQuery = surveyQuery.in("application_id", appIds);
  }

  const { data: surveys, error: surveyErr } = await surveyQuery;

  if (surveyErr) {
    console.error("Failed to fetch survey responses:", surveyErr.message);
    process.exit(1);
  }

  const surveyMap = new Map(
    (surveys || []).map((s) => [s.application_id, s as Record<string, unknown>])
  );

  const rows = (applications || []).map((app) => {
    const survey = (surveyMap.get(app.id) || {}) as Record<string, unknown>;
    return {
      application_id: app.id,
      full_name: app.full_name,
      email: app.email,
      phone: app.phone,
      license_number: app.license_number,
      application_created_at: app.created_at,
      survey_created_at: (survey.created_at as string) || null,
      survey_data: (survey.survey_data as Record<string, unknown>) || {},
      extracted_data: (survey.extracted_data as Record<string, unknown>) || {},
    };
  });

  console.log(JSON.stringify(rows, null, 2));
}

exportSurveyResponses();
