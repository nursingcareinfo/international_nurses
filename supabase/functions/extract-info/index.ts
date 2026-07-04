import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai@2.4.0";
import mammoth from "https://esm.sh/mammoth@1.12.0";

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
    const cvFile = formData.get("cv") as File | null;
    const pncFile = formData.get("pnc") as File | null;

    if (!pncFile) {
      return new Response(JSON.stringify({ error: "PNC License file is mandatory." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const textContents: string[] = [];
    const mediaParts: any[] = [];

    // Process CV
    if (cvFile) {
      const cvBuf = await cvFile.arrayBuffer();
      if (cvFile.name.endsWith(".docx")) {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: cvBuf });
          textContents.push(`CV FILE CONTENT (${cvFile.name}):\n${result.value}`);
        } catch (_) {
          textContents.push(`[Could not extract text from docx CV: ${cvFile.name}]`);
        }
      } else if (cvFile.type.startsWith("text/")) {
        const text = new TextDecoder().decode(cvBuf);
        textContents.push(`CV FILE CONTENT (${cvFile.name}):\n${text}`);
      } else {
        // PDF or image - safe chunked base64 conversion
        const cvArr = new Uint8Array(cvBuf);
        const chunks: string[] = [];
        const chunkSize = 8192;
        for (let i = 0; i < cvArr.length; i += chunkSize) {
          const chunk = cvArr.subarray(i, i + chunkSize);
          chunks.push(String.fromCharCode(...chunk));
        }
        const base64 = btoa(chunks.join(""));

        let cvMime = cvFile.type;
        const cvExt = cvFile.name.split(".").pop()?.toLowerCase();
        if (!cvMime || cvMime === "application/octet-stream") {
          if (cvExt === "pdf") cvMime = "application/pdf";
          else if (cvExt === "png") cvMime = "image/png";
          else if (cvExt === "webp") cvMime = "image/webp";
          else cvMime = "image/jpeg";
        }

        mediaParts.push({
          inlineData: {
            mimeType: cvMime,
            data: base64,
          }
        });
      }
    }

    // Process PNC
    if (pncFile) {
      const pncBuf = await pncFile.arrayBuffer();
      if (pncFile.name.endsWith(".docx")) {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: pncBuf });
          textContents.push(`PNC LICENSE FILE CONTENT (${pncFile.name}):\n${result.value}`);
        } catch (_) {
          textContents.push(`[Could not extract text from docx PNC: ${pncFile.name}]`);
        }
      } else if (pncFile.type.startsWith("text/")) {
        const text = new TextDecoder().decode(pncBuf);
        textContents.push(`PNC LICENSE FILE CONTENT (${pncFile.name}):\n${text}`);
      } else {
        // PDF or image - safe chunked base64 conversion
        const pncArr = new Uint8Array(pncBuf);
        const chunks: string[] = [];
        const chunkSize = 8192;
        for (let i = 0; i < pncArr.length; i += chunkSize) {
          const chunk = pncArr.subarray(i, i + chunkSize);
          chunks.push(String.fromCharCode(...chunk));
        }
        const base64 = btoa(chunks.join(""));

        let pncMime = pncFile.type;
        const pncExt = pncFile.name.split(".").pop()?.toLowerCase();
        if (!pncMime || pncMime === "application/octet-stream") {
          if (pncExt === "pdf") pncMime = "application/pdf";
          else if (pncExt === "png") pncMime = "image/png";
          else if (pncExt === "webp") pncMime = "image/webp";
          else pncMime = "image/jpeg";
        }

        mediaParts.push({
          inlineData: {
            mimeType: pncMime,
            data: base64,
          }
        });
      }
    }

    const promptText = `You are an expert AI recruiter specializing in international nurse placement for healthcare systems in the UK, Middle East, and Europe.
Analyze the uploaded nurse credentials (CV and/or PNC License) and extract structured information into a pristine JSON schema.

Extracted fields guidelines:
1. extractedName: Full legal name of the candidate nurse.
2. extractedEmail: Contact email.
3. extractedPhone: Contact phone number (usually starts with +92 or 03 for Pakistan).
4. extractedLicenseNumber: PNC Registration / License number (mandatory from the license). For Pakistan Nursing Council (PNC) cards, carefully scan the text on the registration card to extract the alphanumeric registration/license number (e.g. A-XXXXX, G-XXXXX, PM-10-A-12345, PM-09-A-12345 or similar registration ID). This is usually labeled as "Registration No", "Reg No", or printed clearly near the bottom or center of the card.
5. extractedAddress: Home address or domicile.
6. extractedLanguages: Comma-separated languages they speak (e.g., Urdu, English).
7. extractedEducation: Academic nursing degrees / diplomas.
8. extractedCertifications: Professional licenses, BLS, ACLS, IELTS, etc.
9. extractedExperience: Practical working history (e.g. 2 years at Shaukat Khanum Hospital).
10. extractedSkills: Practical nursing competencies.

CRITICAL INSTRUCTIONS FOR MULTIMODAL EXTRACTION:
- Scan the uploaded documents carefully. If you receive an image or PDF of a card (such as a Pakistan Nursing Council Registration Card), extract the exact nurse name, license/registration number, and dates from the card text.
- Merge the details from both the CV and the License card into a single unified JSON output.
- Do NOT wrap the JSON in markdown backticks. Return ONLY a valid JSON object matching the schema below. Just raw JSON.

JSON Schema:
{
  "extractedName": "string",
  "extractedEmail": "string",
  "extractedPhone": "string",
  "extractedLicenseNumber": "string",
  "extractedAddress": "string",
  "extractedLanguages": "string",
  "extractedEducation": "string",
  "extractedCertifications": "string",
  "extractedExperience": "string",
  "extractedSkills": "string"
}

Document Content to analyze:
${textContents.join("\n\n---\n\n")}
`;

    // Attempt Gemini first if API Key is available
    let extractedText = "";
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const contentsList: any[] = [];
        for (const m of mediaParts) {
          contentsList.push(m);
        }
        if (textContents.length > 0) {
          contentsList.push({ text: textContents.join("\n\n---\n\n") });
        }
        contentsList.push({ text: promptText });

        const geminiResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: {
            parts: contentsList
          },
          config: { responseMimeType: "application/json" },
        });
        extractedText = geminiResponse.text?.trim() || "";
      } catch (err) {
        console.error("Gemini primary extraction failed:", err);
      }
    }

    // Fallback to Pollinations AI if Gemini wasn't used or failed
    if (!extractedText) {
      try {
        const pResponse = await fetch("https://text.pollinations.ai/openai/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai",
            messages: [
              { role: "system", content: "You are a JSON only extraction assistant." },
              { role: "user", content: promptText }
            ]
          })
        });
        if (pResponse.ok) {
          const data = await pResponse.json();
          extractedText = data.choices?.[0]?.message?.content || "";
        }
      } catch (_) {
        // Silent fallback
      }
    }

    let parsedData = {};
    try {
      parsedData = extractJson(extractedText);
    } catch (_) {
      parsedData = { error: "Failed to parse AI response into JSON.", raw: extractedText };
    }

    const finalExtracted = {
      extractedName: (parsedData as any).extractedName || "",
      extractedEmail: (parsedData as any).extractedEmail || "",
      extractedPhone: (parsedData as any).extractedPhone || "",
      extractedLicenseNumber: (parsedData as any).extractedLicenseNumber || "",
      extractedAddress: (parsedData as any).extractedAddress || "",
      extractedLanguages: (parsedData as any).extractedLanguages || "",
      extractedEducation: (parsedData as any).extractedEducation || "",
      extractedCertifications: (parsedData as any).extractedCertifications || "",
      extractedExperience: (parsedData as any).extractedExperience || "",
      extractedSkills: (parsedData as any).extractedSkills || ""
    };

    return new Response(JSON.stringify({ extractedData: finalExtracted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
