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
      // Non-blocking — log but don't fail the whole request
      console.error("Error inserting survey response:", surveyErr.message);
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
      console.error("Error inserting PNC license data:", pncErr.message);
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
      console.error("Error inserting user profile:", profileErr.message);
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
