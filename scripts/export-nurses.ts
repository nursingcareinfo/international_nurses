import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

// Auth
const supabaseUrl =
  process.env.SUPABASE_URL ||
  "https://ecxohbfvpmdgfiylkxpc.supabase.co";
const serviceRoleKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// ---------- Types ----------

interface SurveyAnswersRow {
  application_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  submitted_at: string | null;
  vehicle_transport: string | null;
  professional_qualification: string | null;
  specialization: string | null; // array joined with ;
  total_years_experience: string | null;
  home_care_experience: string | null;
  institute_name: string | null;
  employment_status: string | null;
  monthly_income: string | null;
  supplemental_income: string | null;
  expected_shift_pay: string | null;
  weekly_availability: string | null;
  available_shifts: string | null; // array joined with ;
  travel_willingness: string | null;
  transition_consideration: string | null;
  preferred_patient_types: string | null; // array joined with ;
  comfort_working_alone: string | null;
  challenges_experienced: string | null; // array joined with ;
  biggest_fears: string | null; // array joined with ;
  safer_with_platform: string | null;
  describe_incident: string | null;
  aware_of_platform: string | null;
  find_work_method: string | null; // array joined with ;
  market_viability: string | null;
  feature_priorities: string | null; // array joined with ;
  would_recommend: string | null;
  additional_comments: string | null;
  follow_up_consent: string | null;
}

interface PersonalInfoRow {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  address: string | null;
  languages: string | null;
  education: string | null;
  experience: string | null;
  skills: string | null;
  council_name: string | null;
  category: string | null;
  verification_status: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  additional_qualifications: string | null;
  nursing_school: string | null;
  graduation_year: number | null;
  pnc_card_present: string | null;
}

/** Nursing application row from the DB (core table). */
interface NursingApplication {
  id: number;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  license_number: string | null;
}

/** User profile row from the DB. */
interface UserProfile {
  application_id: number;
  address: string | null;
  languages: string | null;
  education: string | null;
  experience: string | null;
  skills: string | null;
}

/** PNC license data row from the DB. */
interface PncLicenseData {
  application_id: number;
  council_name: string | null;
  category: string | null;
  verification_status: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  additional_qualifications: string | null;
  nursing_school: string | null;
  graduation_year: number | null;
  pnc_card_present: string | null;
}

// ---------- Helpers ----------

/**
 * Recursively walk a row and join any array value with "; " so SheetJS
 * can write it into a cell.
 */
function flattenArrays(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (Array.isArray(val)) {
      out[key] = val.join("; ");
    } else if (val !== null && typeof val === "object" && !(val instanceof Date)) {
      out[key] = flattenArrays(val as Record<string, unknown>);
    } else {
      out[key] = val;
    }
  }
  return out;
}

/**
 * Fetch all rows from a table/view with pagination via `.range()`.
 * `orderColumn` defaults to "created_at".
 */
async function fetchAll<T>(
  tableOrView: string,
  columns: string,
  filterColumn?: string,
  orderColumn = "created_at",
): Promise<T[]> {
  const allRows: T[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    let query = supabase
      .from(tableOrView)
      .select(columns)
      .order(orderColumn, { ascending: false, nullsFirst: false })
      .range(from, from + pageSize - 1);

    if (filterColumn) {
      query = query.not(filterColumn, "is", null).not(filterColumn, "eq", "");
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Failed to fetch ${tableOrView}:`, error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    allRows.push(...(data as T[]));
    from += pageSize;
  }

  return allRows;
}

// ---------- Main ----------

async function main() {
  // ---- Sheet 1: Survey Answers ----
  console.log("Fetching survey answers …");
  const surveyRows = await fetchAll<SurveyAnswersRow>(
    "survey_answers_flat",
    "*",
    "license_number",
    "submitted_at",
  );

  // Flatten any PostgREST array columns into semicolon-joined strings.
  const surveyAnswers: Record<string, unknown>[] = surveyRows.map((r) =>
    flattenArrays(r as unknown as Record<string, unknown>),
  );

  console.log(`  → ${surveyAnswers.length} rows`);

  // ---- Sheet 2: Personal Info ----
  console.log("Fetching nursing applications …");
  const apps = await fetchAll<NursingApplication>(
    "nursing_applications",
    "id, full_name, email, phone, license_number",
    "license_number",
  );

  console.log(`  → ${apps.length} nursing applications with license numbers`);

  const appIds = apps.map((a) => a.id);

  console.log("Fetching user profiles …");
  let profiles: UserProfile[] = [];
  if (appIds.length > 0) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("application_id, address, languages, education, experience, skills")
      .in("application_id", appIds);

    if (error) {
      console.error("Failed to fetch user_profiles:", error.message);
      process.exit(1);
    }
    profiles = (data ?? []) as UserProfile[];
  }
  console.log(`  → ${profiles.length} user profiles`);

  const profilesByAppId = new Map<number, UserProfile>();
  for (const p of profiles) {
    profilesByAppId.set(p.application_id, p);
  }

  console.log("Fetching PNC license data …");
  let licenseData: PncLicenseData[] = [];
  if (appIds.length > 0) {
    const { data, error } = await supabase
      .from("pnc_license_data")
      .select(
        "application_id, council_name, category, verification_status, issue_date, expiry_date, additional_qualifications, nursing_school, graduation_year, pnc_card_present",
      )
      .in("application_id", appIds);

    if (error) {
      console.error("Failed to fetch pnc_license_data:", error.message);
      process.exit(1);
    }
    licenseData = (data ?? []) as PncLicenseData[];
  }
  console.log(`  → ${licenseData.length} PNC license records`);

  const licenseByAppId = new Map<number, PncLicenseData>();
  for (const ld of licenseData) {
    licenseByAppId.set(ld.application_id, ld);
  }

  // Merge into PersonalInfoRow[]
  const personalInfo: PersonalInfoRow[] = apps.map((app) => {
    const profile = profilesByAppId.get(app.id);
    const lic = licenseByAppId.get(app.id);
    return {
      full_name: app.full_name,
      email: app.email,
      phone: app.phone,
      license_number: app.license_number,
      address: profile?.address ?? null,
      languages: profile?.languages ?? null,
      education: profile?.education ?? null,
      experience: profile?.experience ?? null,
      skills: profile?.skills ?? null,
      council_name: lic?.council_name ?? null,
      category: lic?.category ?? null,
      verification_status: lic?.verification_status ?? null,
      issue_date: lic?.issue_date ?? null,
      expiry_date: lic?.expiry_date ?? null,
      additional_qualifications: lic?.additional_qualifications ?? null,
      nursing_school: lic?.nursing_school ?? null,
      graduation_year: lic?.graduation_year ?? null,
      pnc_card_present: lic?.pnc_card_present ?? null,
    };
  });

  // ---- Write workbook ----
  const outputDir = "exports";
  fs.mkdirSync(outputDir, { recursive: true });

  const dateStr = new Date().toISOString().split("T")[0];
  const filePath = path.join(outputDir, `nurses-export-${dateStr}.xlsx`);

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(surveyAnswers);
  XLSX.utils.book_append_sheet(wb, ws1, "Survey Answers");

  const ws2 = XLSX.utils.json_to_sheet(personalInfo);
  XLSX.utils.book_append_sheet(wb, ws2, "Personal Info");

  XLSX.writeFile(wb, filePath);

  console.log(`✅ Exported to ${filePath}`);
  console.log(`   Sheet 1 "Survey Answers": ${surveyAnswers.length} rows`);
  console.log(`   Sheet 2 "Personal Info": ${personalInfo.length} rows`);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
