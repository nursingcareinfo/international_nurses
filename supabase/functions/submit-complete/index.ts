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
        survey_link_sent: true
      })
      .select()
      .single();

    if (appErr) {
      throw new Error(`Error inserting nursing application: ${appErr.message}`);
    }

    if (!appData) {
      throw new Error("Failed to retrieve created nursing application record.");
    }

    // 2. Insert into survey_responses
    const { data: surveyRes, error: surveyErr } = await supabase
      .from("survey_responses")
      .insert({
        survey_data: surveyData || {},
        extracted_data: extractedData || {},
        application_id: appData.id
      })
      .select()
      .single();

    if (surveyErr) {
      throw new Error(`Error inserting survey response: ${surveyErr.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        applicationId: appData.id,
        surveyResponseId: surveyRes?.id
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
