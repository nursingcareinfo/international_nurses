import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai@2.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helper: Robust JSON extraction from LLM response strings
function extractJson(text: string): any {
  const cleaned = text.trim();
  
  // Try direct parsing
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  // Match markdown code block
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleaned.match(codeBlockRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch (_) {}
  }

  // Match first '{' to last '}'
  const startIdx = cleaned.indexOf("{");
  const endIdx = cleaned.lastIndexOf("}");
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const jsonStr = cleaned.substring(startIdx, endIdx + 1);
    try {
      return JSON.parse(jsonStr);
    } catch (_) {}
  }

  throw new Error("Could not parse valid JSON from Gemini response.");
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("pncCard") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "PNC card image file is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = await file.arrayBuffer();
    const arr = new Uint8Array(buf);
    const chunks: string[] = [];
    const chunkSize = 8192;
    for (let i = 0; i < arr.length; i += chunkSize) {
      const chunk = arr.subarray(i, i + chunkSize);
      chunks.push(String.fromCharCode(...chunk));
    }
    const base64 = btoa(chunks.join(""));

    let mimeType = file.type;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!mimeType || mimeType === "application/octet-stream") {
      if (ext === "png") mimeType = "image/png";
      else if (ext === "webp") mimeType = "image/webp";
      else mimeType = "image/jpeg";
    }

    const mediaPart = {
      inlineData: {
        mimeType: mimeType,
        data: base64,
      }
    };

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      // Fallback simulated data if GEMINI_API_KEY is not configured in Supabase
      return new Response(JSON.stringify({
        licenseNumber: "PM-15-A-98765",
        expiryDate: "2029-11-20",
        info: "Simulated extraction (GEMINI_API_KEY env var not set in Supabase)."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const ocrPrompt = `You are an expert OCR and credential validation system. 
Analyze the uploaded image of a Pakistan Nursing Council (PNC) registration card.
Your goal is to extract the following two pieces of information:
1. "licenseNumber": The official PNC registration/license/card number. PNC registration numbers typically look like:
   - G-XXXXX (where X is a digit)
   - A-XXXXX
   - PM-XX-A-XXXXX (e.g., PM-10-A-12345 or PM-12-G-54321)
   Look for labels such as "Registration No", "Reg No", "Reg. No.", "PNC No", or any clean alphanumeric code on the card.
2. "expiryDate": The card's expiration date in standard "YYYY-MM-DD" format. Look for labels like "Valid Upto", "Expiry Date", "Valid Up to", "Expires On", or similar fields. Read the date from the card (e.g. "15-05-2028", "31 Dec 2029", "25/11/2027") and convert it to standard "YYYY-MM-DD" format.

If any field is completely unreadable or missing, return an empty string for that field.

CRITICAL: Return ONLY a valid JSON object matching the schema below. Do NOT wrap it in any markdown backticks. Just raw JSON.

JSON Schema:
{
  "licenseNumber": "string",
  "expiryDate": "string"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          mediaPart,
          { text: ocrPrompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text?.trim() || "{}";
    const parsedData = extractJson(responseText);
    
    return new Response(JSON.stringify({
      licenseNumber: parsedData.licenseNumber || "",
      expiryDate: parsedData.expiryDate || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "An error occurred." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
