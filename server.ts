import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import mammoth from "mammoth";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { publicHandler, secretHandler, userHandler } from "./src/api/supabase-handler";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// In-memory fallback database for AI Studio Preview
interface Application {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  extractedData: any;
  surveyData: any;
  createdAt: string;
}
const submissionsDb: Application[] = [];

// Multer Memory Storage Configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  }
});

// Helper: parse files to text/docx/images for Gemini
async function parseFile(file: Express.Multer.File): Promise<{ text?: string; part?: any }> {
  let mimeType = file.mimetype;
  const originalName = file.originalname || "";
  const ext = path.extname(originalName).toLowerCase();

  // Override generic or missing mimetypes based on extension to avoid API errors
  if (!mimeType || mimeType === "application/octet-stream") {
    if (ext === ".pdf") {
      mimeType = "application/pdf";
    } else if (ext === ".jpg" || ext === ".jpeg") {
      mimeType = "image/jpeg";
    } else if (ext === ".png") {
      mimeType = "image/png";
    } else if (ext === ".webp") {
      mimeType = "image/webp";
    } else if (ext === ".docx") {
      mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (ext === ".txt") {
      mimeType = "text/plain";
    }
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || ext === ".docx") {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return { text: result.value };
    } catch (e) {
      console.error("Error parsing Word DOCX with mammoth:", e);
      return { text: `[Error parsing DOCX file: ${originalName}]` };
    }
  } else if (mimeType.startsWith("text/") || ext === ".txt") {
    return { text: file.buffer.toString("utf-8") };
  } else {
    // Treat as image or PDF (Gemini native multimodal)
    let finalMime = mimeType;
    if (!finalMime || finalMime === "application/octet-stream") {
      finalMime = "image/jpeg"; // Default fallback
    }
    return {
      part: {
        inlineData: {
          mimeType: finalMime,
          data: file.buffer.toString("base64")
        }
      }
    };
  }
}

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

// 1. API: Extract Info from CV + PNC License
app.post(
  "/api/extract-info",
  upload.fields([
    { name: "cv", maxCount: 1 },
    { name: "pnc", maxCount: 1 }
  ]),
  async (req, res): Promise<any> => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const cvFile = files?.cv?.[0];
      const pncFile = files?.pnc?.[0];

      if (!pncFile) {
        return res.status(400).json({ error: "PNC License file is mandatory." });
      }

      const textContents: string[] = [];
      const mediaParts: any[] = [];

      if (cvFile) {
        const cvParsed = await parseFile(cvFile);
        if (cvParsed.text) textContents.push(`CV FILE CONTENT (${cvFile.originalname}):\n${cvParsed.text}`);
        if (cvParsed.part) mediaParts.push(cvParsed.part);
      }

      if (pncFile) {
        const pncParsed = await parseFile(pncFile);
        if (pncParsed.text) textContents.push(`PNC LICENSE FILE CONTENT (${pncFile.originalname}):\n${pncParsed.text}`);
        if (pncParsed.part) mediaParts.push(pncParsed.part);
      }

      // Initialize Gemini Client
      let ai: GoogleGenAI;
      try {
        ai = getGeminiClient();
      } catch (err: any) {
        console.warn("Gemini client initialization failed, using mock extractor fallback:", err.message);
        // Clean fallback when API key is missing, so user doesn't get stuck
        const mockData = {
          extractedName: "Ayesha Khan",
          extractedEmail: "ayesha.nursing@gmail.com",
          extractedPhone: "+92 321 4567890",
          extractedLicenseNumber: "PNC-98765-N",
          extractedAddress: "House 123, Sector F, Islamabad, Pakistan",
          extractedLanguages: "English, Urdu, Punjabi",
          extractedEducation: "Bachelor of Science in Nursing (BScN) - Dow University",
          extractedCertifications: "BLS (Basic Life Support), ACLS Certified",
          extractedExperience: "3 years as ICU Staff Nurse at Shifa International Hospital",
          extractedSkills: "Critical Care, Patient Assessment, IV Therapy, Electronic Health Records (EHR)"
        };
        return res.json({ extractedData: mockData, info: "Extracted via smart simulation (Gemini API key not configured)." });
      }

      const systemPrompt = `You are an expert AI recruiter specializing in international nurse placement for healthcare systems in the UK, Middle East, and Europe.
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
}`;

      const contentsList: any[] = [];
      
      // Add media attachments if any
      for (const m of mediaParts) {
        contentsList.push(m);
      }

      // Add text contents
      if (textContents.length > 0) {
        contentsList.push({ text: textContents.join("\n\n---\n\n") });
      }

      // Add the prompt instruction
      contentsList.push({ text: systemPrompt });

      const geminiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: contentsList
        },
        config: {
          responseMimeType: "application/json",
        }
      });

      const responseText = geminiResponse.text?.trim() || "{}";
      const parsedData = extractJson(responseText);

      // Clean empty fields
      const finalExtracted = {
        extractedName: parsedData.extractedName || "",
        extractedEmail: parsedData.extractedEmail || "",
        extractedPhone: parsedData.extractedPhone || "",
        extractedLicenseNumber: parsedData.extractedLicenseNumber || "",
        extractedAddress: parsedData.extractedAddress || "",
        extractedLanguages: parsedData.extractedLanguages || "",
        extractedEducation: parsedData.extractedEducation || "",
        extractedCertifications: parsedData.extractedCertifications || "",
        extractedExperience: parsedData.extractedExperience || "",
        extractedSkills: parsedData.extractedSkills || ""
      };

      return res.json({ extractedData: finalExtracted });

    } catch (error: any) {
      console.error("Error in extract-info endpoint:", error);
      return res.status(500).json({ error: error.message || "An error occurred during AI extraction." });
    }
  }
);

// Specialized OCR endpoint for PNC Card
app.post(
  "/api/ocr-pnc",
  upload.single("pncCard"),
  async (req, res): Promise<any> => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "PNC Card image file is mandatory." });
      }

      // Initialize Gemini Client
      let ai: GoogleGenAI;
      try {
        ai = getGeminiClient();
      } catch (err: any) {
        console.warn("Gemini client initialization failed for OCR, using simulated response:", err.message);
        // Fallback simulated OCR output for PNC
        return res.json({
          licenseNumber: "PM-15-A-98765",
          expiryDate: "2029-11-20",
          info: "Simulated extraction (Gemini API key not configured)."
        });
      }

      const parsedFile = await parseFile(file);
      if (!parsedFile.part) {
        return res.status(400).json({ error: "Failed to parse the uploaded file into a valid multimodal image part." });
      }

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
            parsedFile.part,
            { text: ocrPrompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
        }
      });

      const responseText = response.text?.trim() || "{}";
      const parsedData = extractJson(responseText);
      
      return res.json({
        licenseNumber: parsedData.licenseNumber || "",
        expiryDate: parsedData.expiryDate || "",
      });

    } catch (error: any) {
      console.error("Error in OCR PNC endpoint:", error);
      return res.status(500).json({ error: error.message || "An error occurred during PNC card OCR extraction." });
    }
  }
);

// 2. API: Submit Combined Survey + Extracted Data
app.post("/api/submit-complete", async (req, res): Promise<any> => {
  try {
    const { fullName, email, phone, licenseNumber, extractedData, surveyData } = req.body;

    const newSub: Application = {
      id: submissionsDb.length + 1,
      fullName: fullName || extractedData?.extractedName || "",
      phone: phone || extractedData?.extractedPhone || "",
      email: email || extractedData?.extractedEmail || "",
      licenseNumber: licenseNumber || extractedData?.extractedLicenseNumber || "",
      extractedData: extractedData || {},
      surveyData: surveyData || {},
      createdAt: new Date().toISOString()
    };
    submissionsDb.push(newSub);

    // If Supabase is configured, also attempt to insert into actual database
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && !supabaseKey.startsWith("sb_publishable_dummy")) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // 1. Insert into nursing_applications
        const { data: appData, error: appErr } = await supabase
          .from("nursing_applications")
          .insert({
            full_name: newSub.fullName,
            phone: newSub.phone,
            email: newSub.email,
            license_number: newSub.licenseNumber,
            ai_extracted_data: newSub.extractedData,
            survey_link_sent: true
          })
          .select()
          .single();

        if (appErr) throw appErr;

        if (appData) {
          // 2. Insert into survey_responses
          const { error: surveyErr } = await supabase
            .from("survey_responses")
            .insert({
              survey_data: newSub.surveyData,
              extracted_data: newSub.extractedData,
              application_id: appData.id
            });

          if (surveyErr) throw surveyErr;
        }
      } catch (sbError: any) {
        console.warn("Could not sync with Supabase tables (perhaps tables are not created yet). Fallback to in-memory submission.", sbError.message);
      }
    }

    return res.json({ success: true, applicationId: newSub.id });
  } catch (error: any) {
    console.error("Error in submit-complete endpoint:", error);
    return res.status(500).json({ error: error.message || "Failed to submit survey application." });
  }
});

// Endpoint: get list of submissions (useful for debugging/testing in dev mode)
app.get("/api/submissions", (req, res) => {
  res.json(submissionsDb);
});

// Helper: Adapts Express request/response to the standard Web Request/Response format expected by @supabase/server
async function handleFetchRoute(
  handler: { fetch: (req: Request) => Promise<Response> },
  req: express.Request,
  res: express.Response
) {
  const method = req.method;
  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val) {
      if (Array.isArray(val)) {
        val.forEach(v => headers.append(key, v));
      } else {
        headers.set(key, val);
      }
    }
  }

  const protocol = req.protocol;
  const host = req.get("host");
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;
  
  let body: any = undefined;
  if (["POST", "PUT", "PATCH"].includes(method) && req.body) {
    body = JSON.stringify(req.body);
  }

  const webRequest = new Request(fullUrl, {
    method,
    headers,
    body,
  });

  try {
    const webResponse = await handler.fetch(webRequest);
    
    // Copy headers back to Express response
    webResponse.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    res.status(webResponse.status);
    const text = await webResponse.text();
    res.send(text);
  } catch (err: any) {
    console.error("Error executing @supabase/server fetch handler:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}

// @supabase/server SDK demo endpoints
app.all("/api/supabase/public", (req, res) => {
  handleFetchRoute(publicHandler, req, res);
});

app.all("/api/supabase/secret", (req, res) => {
  handleFetchRoute(secretHandler, req, res);
});

app.all("/api/supabase/user", (req, res) => {
  handleFetchRoute(userHandler, req, res);
});

// 3. Admin Export Endpoint — returns all survey answers with names for evaluation
// Requires x-api-key header matching SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY
app.get("/api/admin/export-surveys", async (req, res): Promise<any> => {
  const apiKey = req.headers["x-api-key"] as string;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey || apiKey !== secretKey) {
    return res.status(401).json({
      error: "Unauthorized. Provide service_role key as x-api-key header. Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in .env",
    });
  }

  // Use our hardcoded new-project URL — dotenv doesn't override shell env vars
  // which may still point to the old jobs_for_nurses project
  const supabaseUrl = "https://ecxohbfvpmdgfiylkxpc.supabase.co";

  try {
    const supabase = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false },
    });

    const nameFilter = (req.query.name as string || "")
      .split(",")
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean);

    let query = supabase
      .from("survey_answers_flat")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (nameFilter.length > 0) {
      const or = nameFilter.map((n) => `full_name.ilike.%${n}%`).join(",");
      query = query.or(or);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, count: data?.length || 0, records: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Export failed." });
  }
});

// Vite Middleware Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use("/jobs_for_nurses", express.static(distPath));
    
    app.get("/jobs_for_nurses/*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nursing Recruitment Portal custom server running on http://localhost:${PORT}`);
  });
}

startServer();
