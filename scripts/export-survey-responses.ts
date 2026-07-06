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

  let query = supabase
    .from("survey_answers_flat")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (nameFilter.length > 0) {
    const or = nameFilter
      .map((n) => `full_name.ilike.%${n}%`)
      .join(",");
    query = query.or(or);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch survey answers:", error.message);
    process.exit(1);
  }

  console.log(JSON.stringify(data || [], null, 2));
}

exportSurveyResponses();
