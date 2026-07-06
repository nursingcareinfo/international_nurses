import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fullName, email, phone, licenseNumber, extractedData, surveyData } = await req.json();

    // Create Supabase Admin client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable is missing.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Insert into nursing_applications
    const { data: appData, error: appErr } = await supabase
      .from("nursing_applications")
      .insert({
        full_name: fullName || extractedData?.extractedName || "",
        phone: phone || extractedData?.extractedPhone || "",
        email: email || extractedData?.extractedEmail || "",
        license_number: licenseNumber || extractedData?.extractedLicenseNumber || "",
        ai_extracted_data: extractedData || {},
        survey_link_sent: true,
      })
      .select()
      .single();

    if (appErr) {
      throw new Error(`Error inserting nursing application: ${appErr.message}`);
    }

    if (!appData) {
      throw new Error("Failed to retrieve created nursing application record.");
    }

    const applicationId = appData.id;

    // 2. Insert into survey_responses
    const { error: surveyErr } = await supabase
      .from("survey_responses")
      .insert({
        survey_data: surveyData || {},
        extracted_data: extractedData || {},
        application_id: applicationId,
      });

    if (surveyErr) {
      throw new Error(`Error inserting survey response: ${surveyErr.message}`);
    }

    // 2b. Insert normalized answers into survey_answers for scalable evaluation
    const sd = surveyData || {};
    const toArray = (v: unknown): string[] | null => {
      if (Array.isArray(v)) return v.map(String);
      if (typeof v === "string" && v.length > 0) return [v];
      return null;
    };

    const { error: answersErr } = await supabase
      .from("survey_answers")
      .insert({
        application_id: applicationId,
        vehicle_transport: sd.vehicleTransport ?? null,
        professional_qualification: sd.professionalQualification ?? null,
        specialization: toArray(sd.specialization),
        total_years_experience: sd.totalYearsExperience ?? null,
        home_care_experience: sd.homeCareExperience ?? null,
        institute_name: sd.instituteName ?? null,
        employment_status: sd.employmentStatus ?? null,
        monthly_income: sd.monthlyIncome ?? null,
        supplemental_income: sd.supplementalIncome ?? null,
        expected_shift_pay: sd.expectedShiftPay ?? null,
        weekly_availability: sd.weeklyAvailability ?? null,
        available_shifts: toArray(sd.availableShifts),
        travel_willingness: sd.travelWillingness ?? null,
        transition_consideration: sd.transitionConsideration ?? null,
        preferred_patient_types: toArray(sd.preferredPatientTypes),
        comfort_working_alone: sd.comfortWorkingAlone ?? null,
        challenges_experienced: toArray(sd.challengesExperienced),
        biggest_fears: toArray(sd.biggestFears),
        safer_with_platform: sd.saferWithPlatform ?? null,
        describe_incident: sd.describeIncident ?? null,
        aware_of_platform: sd.awareOfPlatform ?? null,
        find_work_method: toArray(sd.findWorkMethod),
        market_viability: sd.marketViability ?? null,
        feature_priorities: toArray(sd.featurePriorities),
        would_recommend: sd.wouldRecommend ?? null,
        additional_comments: sd.additionalComments ?? null,
        follow_up_consent: sd.followUpConsent ?? null,
      });

    if (answersErr) {
      throw new Error(`Error inserting normalized survey answers: ${answersErr.message}`);
    }

    // 3. Insert into pnc_license_data (normalized PNC card data)
    const pncPayload: Record<string, unknown> = {
      application_id: applicationId,
      license_number: licenseNumber || extractedData?.extractedLicenseNumber || surveyData?.licenseNumber || "",
      council_name: surveyData?.councilName || "Pakistan Nursing Council",
      category: surveyData?.category || null,
      verification_status: surveyData?.verificationStatus || "Active",
      issue_date: surveyData?.issueDate || null,
      expiry_date: surveyData?.expiryDate || null,
      additional_qualifications: surveyData?.additionalQualifications || null,
      nursing_school: surveyData?.nursingSchool || null,
      graduation_year: surveyData?.graduationYear ? parseInt(surveyData.graduationYear) : null,
      pnc_card_present: surveyData?.pncCardPresent || null,
    };

    const { error: pncErr } = await supabase
      .from("pnc_license_data")
      .insert(pncPayload);

    if (pncErr) {
      throw new Error(`Error inserting PNC license data: ${pncErr.message}`);
    }

    // 4. Insert into user_profiles (normalized candidate profile)
    const profilePayload: Record<string, unknown> = {
      application_id: applicationId,
      full_name: fullName || extractedData?.extractedName || "",
      email: email || extractedData?.extractedEmail || "",
      phone: phone || extractedData?.extractedPhone || "",
      address: surveyData?.address || extractedData?.extractedAddress || "",
      languages: surveyData?.languageProficiency || extractedData?.extractedLanguages || "",
      education: surveyData?.additionalQualifications || extractedData?.extractedEducation || "",
      experience: extractedData?.extractedExperience ||
        `${surveyData?.jobTitle || ""} at ${surveyData?.currentEmployer || ""}`.trim() ||
        null,
      skills: extractedData?.extractedSkills || "Nursing Care",
    };

    const { error: profileErr } = await supabase
      .from("user_profiles")
      .insert(profilePayload);

    if (profileErr) {
      throw new Error(`Error inserting user profile: ${profileErr.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        applicationId: applicationId,
        message: "Application, PNC license data, and user profile stored successfully.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
