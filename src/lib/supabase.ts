import { createClient } from "@supabase/supabase-js";

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ecxohbfvpmdgfiylkxpc.supabase.co";
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_dummy_key_for_recruitment_portal";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function callEdgeFunction(name: string, body: any) {
  // Always use local Express server for AI extraction and OCR endpoints in the dev environment
  // to ensure they utilize the container's real GEMINI_API_KEY and avoid secret-sharing issues with Supabase.
  const isAiEndpoint = name === "extract-info" || name === "ocr-pnc";
  const isLocalContainer = 
    window.location.hostname.includes("run.app") || 
    window.location.hostname.includes("localhost") || 
    window.location.hostname.includes("127.0.0.1");

  const preferLocal = isAiEndpoint && isLocalContainer;

  // If we have real credentials and this is not a local AI endpoint request, try calling the Supabase Edge Function
  // @ts-ignore
  const hasRealCredentials = 
    !preferLocal &&
    // @ts-ignore
    import.meta.env.VITE_SUPABASE_URL && 
    // @ts-ignore
    import.meta.env.VITE_SUPABASE_ANON_KEY && 
    // @ts-ignore
    !import.meta.env.VITE_SUPABASE_ANON_KEY.startsWith("sb_publishable_dummy") &&
    // @ts-ignore
    import.meta.env.VITE_SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

  if (hasRealCredentials) {
    try {
      const url = `${supabaseUrl}/functions/v1/${name}`;
      const isFormData = body instanceof FormData;
      
      const headers: Record<string, string> = {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
      };
      
      if (!isFormData) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: isFormData ? body : JSON.stringify(body),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const errText = await response.text();
        console.warn(`Supabase Edge Function ${name} returned ${response.status}: ${errText}. Falling back to local Express server.`);
      }
    } catch (e) {
      console.warn(`Failed calling Supabase Edge Function ${name}, falling back to local Express server:`, e);
    }
  }

  // Fallback to our local custom Express server
  const isFormData = body instanceof FormData;
  const localUrl = `/api/${name}`;
  
  const localHeaders: Record<string, string> = {};
  if (!isFormData) {
    localHeaders["Content-Type"] = "application/json";
  }

  const localRes = await fetch(localUrl, {
    method: "POST",
    headers: localHeaders,
    body: isFormData ? body : JSON.stringify(body),
  });

  if (!localRes.ok) {
    const errorJson = await localRes.json().catch(() => ({}));
    throw new Error(errorJson.error || `Server extraction failed with status ${localRes.status}`);
  }

  return await localRes.json();
}
