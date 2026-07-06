import mammoth from "npm:mammoth@1.6.0";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;
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

function isTextFile(fileName: string): boolean {
  const name = fileName.toLowerCase();
  return name.endsWith(".txt") || name.endsWith(".csv") || name.endsWith(".json") || name.endsWith(".md");
}

const GEMINI_INSTRUCTION = `You are a precise OCR extraction engine for nursing CV/resume and PNC license documents from Pakistan.

Extract the following fields from the document. Look for them even if they appear in different formats, tables, or layouts. Be thorough — scan the entire document.

Required fields (output JSON keys):
- name: Full name of the candidate (e.g. "Fatima Akhtar")
- email: Email address
- phone: Phone number with country code (Pakistan: +92...)
- pnc_license_number: PNC license number (e.g. "PNC-12345" or just "12345")
- address: Full residential address
- languages: Languages spoken (comma separated)
- education: Educational qualifications (e.g. "BSN, Post-RN")
- experience: Professional experience summary
- skills: Clinical/technical skills (comma separated)
- certifications: Professional certifications (e.g. "ACLS, BLS, PALS")

Rules:
- If a field is not found anywhere in the document, omit it from the JSON.
- Extract the EXACT text — do not paraphrase.
- For phone numbers, use international format.
- For PNC license, look for "PNC" followed by numbers, or just a 4-10 digit number near "License" or "Licence".
- Return ONLY valid JSON with no markdown formatting, no code blocks, no extra text.`;

const POLLINATIONS_URL = "https://text.pollinations.ai/openai/chat/completions";

async function extractDocxText(file: File): Promise<{ text: string; debug: Record<string, unknown> }> {
  const debug: Record<string, unknown> = {};
  try {
    const buffer = await file.arrayBuffer();
    debug.bufferSize = buffer.byteLength;
    debug.fileSize = file.size;
    debug.fileName = file.name;

    // Try mammoth
    try {
      const result = await mammoth.extractRawText({ buffer });
      debug.mammothChars = result.value?.length ?? 0;
      debug.mammothMessages = result.messages;
      debug.textPreview = (result.value || "").slice(0, 200);
      if (result.value) return { text: result.value, debug };
    } catch (e: any) {
      debug.mammothError = e.message;
    }

    // Fallback: manual ZIP parse
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

async function callAiWithText(text: string, debug?: Record<string, unknown>): Promise<Record<string, string> | null> {
  const prompt = GEMINI_INSTRUCTION + "\n\nDocument content:\n" + text;

  try {
    const polliBody = { model: "openai", messages: [{ role: "user", content: prompt }], temperature: 0.1 };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(POLLINATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(polliBody),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (content) {
        debug && (debug.polliRaw = content.slice(0, 500));
        const result = parseAnyJsonResponse(content);
        if (result) return result;
      }
    } else {
      debug && (debug.polliStatus = res.status);
    }
  } catch (e) {
    debug && (debug.polliError = String(e));
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) { debug && (debug.geminiError = "no api key"); return null; }

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
  };
  debug && (debug.geminiBodyLen = JSON.stringify(body).length);

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
        console.error(`Gemini text API error (${res.status}): ${errText}`);
        debug && (debug.geminiHttpStatus = res.status);
        debug && (debug.geminiHttpBody = errText.slice(0, 500));
        if (res.status === 429 && attempt < MAX_RETRIES) {
          debug && (debug.geminiRetry = true);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        return null;
      }
      const result = await res.json();
      const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textContent) {
        debug && (debug.geminiRaw = textContent.slice(0, 500));
        return parseAnyJsonResponse(textContent);
      }
    } catch (err) {
      console.error(`Gemini attempt ${attempt + 1} failed:`, err);
      debug && (debug.geminiCatchError = String(err));
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
    }
  }
  return null;
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


async function callGemini(file: File): Promise<Record<string, string> | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;

  const mimeType = getMimeType(file.name);

  if (isTextFile(file.name)) {
    const text = await file.text();
    return await callAiWithText(text);
  }

  if (mimeType.startsWith("image/") || mimeType === "application/pdf") {
    const base64 = await fileToBase64(file);
    const body = {
      contents: [{ parts: [
        { text: GEMINI_INSTRUCTION + "\n\nThis is a scanned document or image. Extract all text content from it." },
        { inlineData: { mimeType, data: base64 } },
      ] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
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
          if (res.status === 429 && attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 3000));
            continue;
          }
          return null;
        }
        const result = await res.json();
        const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) return parseAnyJsonResponse(textContent);
      } catch (err) {
        console.error(`Gemini attempt ${attempt + 1} failed:`, err);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
      }
    }
    return null;
  }

  return null;
}

function mergeData(entries: Array<Record<string, string>>): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const entry of entries) {
    for (const [key, value] of Object.entries(entry)) {
      if (value && !merged[key]) {
        merged[key] = value;
      }
    }
  }
  return merged;
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

    for (const [key, file] of [["cv", cvFile], ["pnc", pncFile]] as const) {
      if (!file || file.size === 0) continue;
      if (file.size > MAX_FILE_SIZE) {
        warnings.push(`${key} file exceeds 5MB limit`);
        continue;
      }
      filesToProcess.push({ file, source: key });
    }

    const geminiResults: Array<Record<string, string>> = [];
    const textFallbacks: string[] = [];
    const debugDocx: Record<string, unknown>[] = [];

    for (const { file, source } of filesToProcess) {
      if (isTextFile(file.name)) {
        textFallbacks.push(await file.text());
      }

      const isDocx = file.name.endsWith(".docx") || file.name.endsWith(".doc");
      let docxDebug: Record<string, unknown> | undefined;

      if (isDocx) {
        try {
          const { text: docxText, debug } = await extractDocxText(file);
          docxDebug = debug;
          if (docxText) {
            const geminiResult = await callAiWithText(docxText, docxDebug);
            if (geminiResult && Object.keys(geminiResult).length > 0) {
              geminiResults.push(geminiResult);
            } else {
              warnings.push(`Could not extract data from ${file.name}`);
            }
            docxDebug.geminiResult = geminiResult;
            debugDocx.push(docxDebug);
            continue;
          }
        } catch (e: any) {
          docxDebug = { error: e.message, stack: e.stack };
        }
      }

      const geminiResult = await callGemini(file);
      if (geminiResult && Object.keys(geminiResult).length > 0) {
        geminiResults.push(geminiResult);
      } else if (!isTextFile(file.name)) {
        warnings.push(`Could not extract data from ${file.name}`);
      }

      if (isDocx && docxDebug) debugDocx.push(docxDebug);
    }

    let extractedData: Record<string, string> = {};
    if (geminiResults.length > 0) {
      extractedData = mergeData(geminiResults);
    }
    if (Object.keys(extractedData).length === 0 && textFallbacks.length > 0) {
      const combinedText = textFallbacks.join("\n---\n");
      extractedData = extractViaRegex(combinedText);
    }

    const fileInfo = filesToProcess.map(f => ({ name: f.file.name, size: f.file.size, type: f.file.type, isDocx: f.file.name.endsWith(".docx") }));
    const docxInfo = debugDocx.map(d => (typeof d === 'object' ? JSON.stringify(d).slice(0, 800) : String(d)));

    return new Response(
      JSON.stringify({
        extractedData,
        warnings: warnings.length > 0 ? warnings : undefined,
        _debugDocx: debugDocx.length > 0 ? debugDocx : undefined,
        _files: fileInfo,
        _docxDebugRaw: docxInfo,
        _version: "mammoth-v3",
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
