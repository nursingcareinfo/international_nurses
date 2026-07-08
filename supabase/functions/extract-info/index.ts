import mammoth from "npm:mammoth@1.6.0";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 45_000;
const MAX_RETRIES = 2;

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization",
};

function extractViaRegex(text: string): Record<string, string> {
  const data: Record<string, string> = {};

  const nameMatch = text.match(/(?:Name|name|Candidate|Nurse|Dr\.)\s*:\s*([A-Za-z .'-]+)/);
  if (nameMatch) data.extractedName = nameMatch[1].trim();
  else {
    const drMatch = text.match(/(Dr\.\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (drMatch) data.extractedName = drMatch[1].trim();
  }

  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) data.extractedEmail = emailMatch[1].trim();

  const phoneMatch = text.match(/(?:\+92|0|92)?[\s-]?3\d{2}[\s-]?\d{7}/);
  if (phoneMatch) {
    let phone = phoneMatch[0].replace(/\s+/g, "").replace(/-/g, "");
    if (phone.startsWith("0")) phone = "+92" + phone.substring(1);
    else if (phone.startsWith("92") && !phone.startsWith("+92")) phone = "+" + phone;
    else if (!phone.startsWith("+")) phone = "+92" + phone;
    if (phone.startsWith("+92") && phone.length >= 12) {
      data.extractedPhone = "+92 " + phone.substring(3, 6) + " " + phone.substring(6);
    } else {
      data.extractedPhone = phone;
    }
  } else {
    const anyPhone = text.match(/(\+\d{1,3}[\s-]?\d{8,12})/);
    if (anyPhone) data.extractedPhone = anyPhone[1].trim();
  }

  const pncMatch = text.match(/(?:PNC|Pnc|pnc)[:\s-]*(\d{4,10})/);
  if (pncMatch) data.extractedLicenseNumber = "PNC-" + pncMatch[1];
  else {
    const licMatch = text.match(/(?:License|Licence|license|licence)\s*:\s*([A-Za-z0-9-]+)/i);
    if (licMatch) data.extractedLicenseNumber = licMatch[1].trim();
  }

  const addrMatch = text.match(/(?:Address|address)\s*:\s*(.+)/);
  if (addrMatch) data.extractedAddress = addrMatch[1].trim();

  const langMatch = text.match(/(?:Languages|languages)\s*:\s*(.+)/);
  if (langMatch) data.extractedLanguages = langMatch[1].trim();

  const eduMatch = text.match(/(?:Education|Qualification|qualification|education)\s*:\s*(.+)/);
  if (eduMatch) data.extractedEducation = eduMatch[1].trim();

  const expMatch = text.match(/(?:Experience|experience)\s*:\s*(.+)/);
  if (expMatch) data.extractedExperience = expMatch[1].trim();

  const skillsMatch = text.match(/(?:Skills|skills)\s*:\s*(.+)/);
  if (skillsMatch) data.extractedSkills = skillsMatch[1].trim();

  const certMatch = text.match(/(?:Certifications|certifications)\s*:\s*(.+)/);
  if (certMatch) data.extractedCertifications = certMatch[1].trim();

  return data;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

function getMimeType(fileName: string): string {
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (name.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

const GEMINI_INSTRUCTION = `You are a precise data extraction engine for Pakistani nursing CVs and PNC license documents.

Extract the fields below from the document(s). Return ONLY a single JSON object — no markdown, no code fences, no greeting, no explanation.

Expected output format (use these exact 10 keys, omit any field not found):
{
  "name": "Full name of the nurse candidate",
  "email": "Email address",
  "phone": "Phone with Pakistan country code +92...",
  "pnc_license_number": "PNC registration/license number",
  "address": "Full residential address",
  "languages": "Languages spoken (comma-separated, e.g. Urdu, English, Punjabi)",
  "education": "Educational qualifications (e.g. BSN, Post-RN, Diploma in Midwifery, MSc Nursing)",
  "experience": "Professional experience summary",
  "skills": "Clinical/technical skills (comma-separated, e.g. Patient Assessment, Wound Care, IV Therapy, NICU)",
  "certifications": "Professional certifications (comma-separated, e.g. ACLS, BLS, PALS)"
}

Extraction rules:
- Extract EXACT text from the document — do not paraphrase or summarize.
- Omit any field completely if not found (do NOT include it with an empty string value).
- For phone: always convert to international format starting with +92 for Pakistani numbers.
- For PNC license: look for "PNC" followed by digits, or a registration number near "License"/"Licence"/"Reg No". Common formats: A-XXXXX, G-XXXXX, PK-S-XX-A-XXXXX.
- For education: capture degree names like BSN, Post-RN, Diploma in Midwifery, MSc Nursing, etc.
- For skills: capture specific clinical skills verbatim.
- Scan tables, headers, footers, and all sections of the document(s).
- If you receive multiple files (e.g. a CV and a PNC card), merge the data from ALL files into ONE JSON output.
- Return ONLY valid JSON. No markdown formatting, no code blocks, no extra text.`;

const POLLINATIONS_URL = "https://text.pollinations.ai/openai/chat/completions";

async function extractDocxText(file: File): Promise<{ text: string; debug: Record<string, unknown> }> {
  const debug: Record<string, unknown> = {};
  try {
    const buffer = await file.arrayBuffer();
    debug.bufferSize = buffer.byteLength;
    debug.fileSize = file.size;
    debug.fileName = file.name;

    try {
      const result = await mammoth.extractRawText({ buffer });
      debug.mammothChars = result.value?.length ?? 0;
      debug.mammothMessages = result.messages;
      debug.textPreview = (result.value || "").slice(0, 200);
      if (result.value) return { text: result.value, debug };
    } catch (e: any) {
      debug.mammothError = e.message;
    }

    try {
      const view = new Uint8Array(buffer);
      const decoder = new TextDecoder();
      let offset = 0;
      const entries: string[] = [];

      while (offset < view.length - 30) {
        if (view[offset] !== 0x50 || view[offset + 1] !== 0x4b ||
            view[offset + 2] !== 0x03 || view[offset + 3] !== 0x04) {
          offset++;
          continue;
        }

        const nameLen = view[offset + 26] | (view[offset + 27] << 8);
        const extraLen = view[offset + 28] | (view[offset + 29] << 8);
        const compMethod = view[offset + 8] | (view[offset + 9] << 8);
        const compSize = view[offset + 18] | (view[offset + 19] << 8) |
                        (view[offset + 20] << 16) | (view[offset + 21] << 24);
        const fileName = decoder.decode(view.slice(offset + 30, offset + 30 + nameLen));

        entries.push(`${fileName}(m=${compMethod},cs=${compSize})`);

        if (fileName === "word/document.xml") {
          const dataStart = offset + 30 + nameLen + extraLen;
          const xmlBytes = view.slice(dataStart, dataStart + compSize);

          if (compMethod === 0) {
            const docXml = decoder.decode(xmlBytes);
            const texts = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
            if (texts) {
              const text = texts.map((t: string) => t.replace(/<\/?w:t[^>]*>/g, "")).join(" ").replace(/\s+/g, " ").trim();
              debug.method = "zip-stored";
              debug.textPreview = text.slice(0, 200);
              return { text, debug };
            }
          }

          if (compMethod === 8) {
            try {
              const ds = new DecompressionStream("deflate-raw");
              const writer = ds.writable.getWriter();
              writer.write(xmlBytes);
              writer.close();
              const reader = ds.readable.getReader();
              const chunks: Uint8Array[] = [];
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
              }
              const totalLen = chunks.reduce((s, c) => s + c.byteLength, 0);
              const combined = new Uint8Array(totalLen);
              let pos = 0;
              for (const c of chunks) { combined.set(c, pos); pos += c.byteLength; }
              const docXml = decoder.decode(combined);
              const texts = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
              if (texts) {
                const text = texts.map((t: string) => t.replace(/<\/?w:t[^>]*>/g, "")).join(" ").replace(/\s+/g, " ").trim();
                debug.method = "zip-deflate";
                debug.decompressedLen = combined.length;
                debug.textPreview = text.slice(0, 200);
                return { text, debug };
              }
            } catch (e: any) {
              debug.deflateError = e.message;
            }
          }
        }

        offset += 30 + nameLen + extraLen + compSize;
      }

      debug.entries = entries;
    } catch (e: any) {
      debug.zipError = e.message;
    }

    return { text: "", debug };
  } catch (err: any) {
    debug.topError = err.message;
    return { text: "", debug };
  }
}

function parseAnyJsonResponse(text: string): Record<string, string> | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const mapped: Record<string, string> = {};
    if (parsed.name) mapped.extractedName = String(parsed.name);
    if (parsed.email) mapped.extractedEmail = String(parsed.email);
    if (parsed.phone) {
      let p = String(parsed.phone).replace(/\s+/g, "");
      if (p.startsWith("0")) p = "+92" + p.substring(1);
      else if (p.startsWith("92") && !p.startsWith("+92")) p = "+" + p;
      else if (!p.startsWith("+")) p = "+92" + p;
      if (p.startsWith("+92") && p.length >= 12) {
        mapped.extractedPhone = "+92 " + p.substring(3, 6) + " " + p.substring(6);
      } else {
        mapped.extractedPhone = p;
      }
    }
    if (parsed.pnc_license_number) mapped.extractedLicenseNumber = String(parsed.pnc_license_number);
    if (parsed.address) mapped.extractedAddress = String(parsed.address);
    if (parsed.languages) mapped.extractedLanguages = String(parsed.languages);
    if (parsed.education) mapped.extractedEducation = String(parsed.education);
    if (parsed.experience) mapped.extractedExperience = String(parsed.experience);
    if (parsed.skills) mapped.extractedSkills = String(parsed.skills);
    if (parsed.certifications) mapped.extractedCertifications = String(parsed.certifications);
    if (Object.keys(mapped).length > 0) return mapped;
  } catch {}
  return null;
}

/**
 * Try Pollinations AI (free, no quota) for text-based extraction.
 */
async function callPollinations(prompt: string): Promise<Record<string, string> | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(POLLINATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (content) return parseAnyJsonResponse(content);
    }
  } catch (e) {
    console.error("Pollinations AI error:", e);
  }
  return null;
}

/**
 * Try Cloudflare Workers AI (free tier, vision-capable) for image/PDF analysis.
 */
async function callCloudflareAI(
  files: Array<{ name: string; mimeType: string; base64: string }>,
  prompt: string,
): Promise<Record<string, string> | null> {
  const cfAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const cfApiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  if (!cfAccountId || !cfApiToken) return null;

  const model = "@cf/meta/llama-3.2-11b-vision-instruct";
  const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${model}`;

  // For vision model, send each image separately and merge results
  for (const file of files) {
    try {
      const dataUri = `data:${file.mimeType};base64,${file.base64}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cfApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          image: dataUri,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        const text = json?.result?.description || json?.result?.response || "";
        if (text) {
          const parsed = parseAnyJsonResponse(text);
          if (parsed) return parsed;
        }
      } else {
        const errText = await res.text();
        console.error(`Cloudflare AI error (${res.status}): ${errText}`);
      }
    } catch (e) {
      console.error("Cloudflare AI error:", e);
    }
  }
  return null;
}

/**
 * Call Gemini API with a combined prompt + optional inline files.
 * Sends ALL files in a SINGLE API call (saves quota).
 */
async function callGeminiCombined(
  prompt: string,
  files: Array<{ name: string; mimeType: string; base64: string }>,
): Promise<{ result: Record<string, string> | null; rateLimited: boolean; _error?: string }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return { result: null, rateLimited: false };

  const parts: any[] = [];

  // Add each file as inline data
  for (const file of files) {
    parts.push({
      inlineData: { mimeType: file.mimeType, data: file.base64 },
    });
  }

  // Add the instruction prompt
  parts.push({ text: prompt });

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Gemini API error (${res.status}): ${errText}`);

        // Rate limited or overloaded — wait with exponential backoff
        if (res.status === 429 || res.status === 503) {
          const retryMatch = errText.match(/retry in (\d+(?:\.\d+)?)s/);
          const delayMs = retryMatch ? Math.min(parseFloat(retryMatch[1]) * 1000 + 1000, 30000) : (res.status === 503 ? 3000 : 5000);
          console.log(`Gemini ${res.status}, waiting ${delayMs}ms before retry ${attempt + 1}/${MAX_RETRIES + 1}`);
          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, delayMs));
            continue;
          }
          return { result: null, rateLimited: res.status === 429 };
        }

        // Non-retryable error
        console.error("Gemini non-retryable error body:", errText.substring(0, 500));
        return { result: null, rateLimited: false, _error: errText.substring(0, 500) };
      }

      const result = await res.json();
      const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textContent) {
        const parsed = parseAnyJsonResponse(textContent);
        if (parsed) return { result: parsed, rateLimited: false };
      }
      return { result: null, rateLimited: false };
    } catch (err) {
      console.error(`Gemini attempt ${attempt + 1} failed:`, err);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
    }
  }

  return { result: null, rateLimited: false };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const cvFile = formData.get("cv") as File | null;
    const pncFile = formData.get("pnc") as File | null;

    if ((!cvFile || cvFile.size === 0) && (!pncFile || pncFile.size === 0)) {
      return new Response(
        JSON.stringify({ extractedData: {}, warning: "No files uploaded" }),
        { headers: corsHeaders },
      );
    }

    const warnings: string[] = [];
    const filesToProcess: Array<{ file: File; source: string }> = [];
    let combinedText = "";

    for (const [key, file] of [["cv", cvFile], ["pnc", pncFile]] as const) {
      if (!file || file.size === 0) continue;
      if (file.size > MAX_FILE_SIZE) {
        warnings.push(`${key} file exceeds 5MB limit`);
        continue;
      }
      filesToProcess.push({ file, source: key });
    }

    let extractedData: Record<string, string> = {};

    // ---------- STRATEGY 1: Try Gemini with ALL files in ONE call ----------
    const geminiFiles: Array<{ name: string; mimeType: string; base64: string }> = [];
    let hasDocx = false;
    let docxTexts: string[] = [];

    for (const { file } of filesToProcess) {
      const mimeType = getMimeType(file.name);

      if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
        hasDocx = true;
        try {
          const { text } = await extractDocxText(file);
          if (text) docxTexts.push(`=== ${file.name} ===\n${text}`);
        } catch (e: any) {
          warnings.push(`Could not read ${file.name}: ${e.message}`);
        }
      }

      // For PDF, images — prepare as inline data for Gemini vision
      if (mimeType.startsWith("image/") || mimeType === "application/pdf") {
        try {
          const base64 = await fileToBase64(file);
          geminiFiles.push({ name: file.name, mimeType, base64 });
        } catch (e: any) {
          warnings.push(`Could not encode ${file.name}: ${e.message}`);
        }
      }
    }

    // If we have DOCX text, add it to the prompt
    let prompt = GEMINI_INSTRUCTION;
    if (docxTexts.length > 0) {
      prompt += "\n\n=== DOCUMENT TEXT ===\n" + docxTexts.join("\n\n");
      combinedText = docxTexts.join("\n");
    }

    if (geminiFiles.length > 0 || docxTexts.length > 0) {
      const { result, rateLimited, _error } = await callGeminiCombined(prompt, geminiFiles);
      if (result && Object.keys(result).length > 0) {
        extractedData = result;
      } else if (rateLimited) {
        warnings.push("AI extraction is currently rate-limited. Trying alternative extraction method...");
      } else if (_error) {
        warnings.push(`AI extraction error: ${_error}`);
      } else {
        warnings.push("AI extraction returned no data. Trying alternative method...");
      }
    }

    // ---------- STRATEGY 2: Try Cloudflare Workers AI (vision-capable, free) ----------
    if (Object.keys(extractedData).length === 0 && geminiFiles.length > 0) {
      console.log("Gemini failed, trying Cloudflare Workers AI fallback...");
      const cfResult = await callCloudflareAI(geminiFiles, GEMINI_INSTRUCTION);
      if (cfResult && Object.keys(cfResult).length > 0) {
        extractedData = cfResult;
      }
    }

    // ---------- STRATEGY 3: Fallback to Pollinations AI (free, no quota, text-only) ----------
    if (Object.keys(extractedData).length === 0 && combinedText) {
      console.log("Gemini failed, trying Pollinations AI fallback...");
      const polliResult = await callPollinations(
        GEMINI_INSTRUCTION + "\n\nDocument content:\n" + combinedText,
      );
      if (polliResult && Object.keys(polliResult).length > 0) {
        extractedData = polliResult;
      }
    }

    // ---------- STRATEGY 4: Regex fallback for text content ----------
    if (Object.keys(extractedData).length === 0 && combinedText) {
      console.log("Pollinations failed, trying regex extraction...");
      extractedData = extractViaRegex(combinedText);
    }

    // Report per-file warnings for files that weren't used
    if (Object.keys(extractedData).length === 0 && filesToProcess.length > 0) {
      warnings.push("Could not extract structured data from the uploaded files. Please ensure documents are clear and try again.");
    }

    const fileInfo = filesToProcess.map(f => ({
      name: f.file.name,
      size: f.file.size,
      type: f.file.type,
    }));

    return new Response(
      JSON.stringify({
        extractedData,
        warnings: warnings.length > 0 ? warnings : undefined,
        _files: fileInfo,
        _version: "combined-v1",
      }),
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error("Extraction error:", err);
    return new Response(
      JSON.stringify({
        extractedData: {},
        error: err instanceof Error ? err.message : "Failed to process files",
      }),
      { headers: corsHeaders },
    );
  }
});
