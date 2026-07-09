# fix-pdf-text-extraction - Work Plan

## TL;DR (For humans)

**What you'll get:** PDF resumes (CVs) will be auto-filled into the survey form, just like DOCX resumes already are. If someone uploads a PDF resume alongside their PNC license, their name, license number, years of experience, last hospital, and other details will be extracted and pre-filled into the application form — same as DOCX uploads.

**Why this approach:** The edge function already has a working text-extraction pipeline for DOCX files. PDF support was simply missing. We're adding a PDF text extractor (unpdf) that mirrors how DOCX text is already handled — minimal new code, maximal reuse of existing fallback strategies (Gemini, Cloudflare AI, Pollinations, regex).

**What it will NOT do:** Won't extract images from PDFs (only text). Won't change the PNC card OCR flow (image-only). Won't modify the UI or database schema.

**Effort:** Short
**Risk:** Low — addition-only, no existing code changed, well-understood pattern
**Decisions to sanity-check:** unpdf was chosen over pdfjs-dist because it's designed for Deno/serverless runtimes and avoids worker/global compatibility issues

Your next move: **Approve the plan**, then run `$start-work fix-pdf-text-extraction` to execute it.

---

> TL;DR (machine): Short | Low | Add PDF text extraction to extract-info edge function using unpdf, deploy v50

## Scope
### Must have
- `extractPdfText()` function that returns text content from text-based PDFs
- PDF text fed into `docxTexts` array and `combinedText` variable (same as DOCX text)
- All 4 extraction strategies (Gemini, Cloudflare AI, Pollinations, regex) can use PDF text
- Deployed to Supabase as edge function v50

### Must NOT have (guardrails, anti-slop, scope boundaries)
- No image extraction from PDFs
- No changes to server.ts (separate track if needed)
- No UI/database changes
- No changes to ocr-pnc function

## Verification strategy
- Test decision: tests-after + manual live-site verification
- Evidence: .omo/evidence/task-1-fix-pdf-text-extraction.md (verification report)
- Will verify by uploading a PDF CV + PNC JPEG to the live site and confirming extraction works

## Execution strategy
### Parallel execution waves
Wave 1 (single todo): Implement + deploy fix

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1. Add PDF text extraction | None | F1-F4 | None (single todo) |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [ ] 1. Add PDF text extraction to extract-info edge function
  What to do / Must NOT do:
    - Add `import { extractText } from "npm:unpdf"` at the top of `supabase/functions/extract-info/index.ts`
    - Add `extractPdfText(file: File): Promise<string>` function:
      - Read file buffer with `await file.arrayBuffer()`
      - Create a Uint8Array from the buffer
      - Call `extractText(new Uint8Array(buffer))` from unpdf
      - Return concatenated text from all pages
      - On error, log and return `""` (never crash)
    - In the file-processing loop (lines 595-629), add PDF handling:
      - For `.pdf` files, call `extractPdfText()`
      - If text returned, push to `docxTexts` array AND append to `combinedText`
      - Keep existing behavior of also sending PDF as inline binary to Gemini
    - Must NOT change any existing DOCX or image handling code
    - Must NOT import unpdf globally — import inside the function to avoid startup issues
  Parallelization: Wave 1 | Blocked by: None | Blocks: F1-F4
  References:
    - `supabase/functions/extract-info/index.ts:1` — existing import pattern (npm:mammoth)
    - `supabase/functions/extract-info/index.ts:144-243` — existing `extractDocxText()` function (parallel design pattern)
    - `supabase/functions/extract-info/index.ts:595-629` — file-processing loop to modify
    - `supabase/functions/extract-info/index.ts:632-636` — where docxTexts and combinedText are assembled
  Acceptance criteria (agent-executable):
    1. Edge function deploys without errors: `npx supabase functions deploy extract-info --no-verify-jwt`
    2. Uploading a PDF CV + PNC JPEG returns extractedData with at least extractedName, extractedLicenseNumber
  QA scenarios:
    - Happy: Upload Sharoon's PDF CV + PNC JPEG → expect extractedData.name === "SHAROON LAWRENCE KHOKHAR"
    - Failure: Upload empty/corrupt PDF → expect graceful handling, empty extractedData, no crash
    - Regression: Upload Alwin's DOCX CV + PNC JPEG → still extracts name/license as before
    Evidence: `.omo/evidence/task-1-fix-pdf-text-extraction.md`
  Commit: Y | `feat(extract-info): add PDF text extraction using unpdf`

## Final verification wave
- [ ] F1. Plan compliance audit — verify all todos completed, no scope drift
- [ ] F2. Code quality review — check for try/catch safety, no global imports, no dead code
- [ ] F3. Real manual QA — upload Sharoon's PDF + PNC to live site, confirm extraction works
- [ ] F4. Scope fidelity — confirm no changes to server.ts, ocr-pnc, UI, or database

## Commit strategy
- Single commit: `feat(extract-info): add PDF text extraction using unpdf`
- Commit message body should reference this plan

## Success criteria
- PDF resume text is extracted and available to all 4 extraction strategies
- Sharoon's PDF CV + PNC JPEG successfully extracts: name "SHAROON LAWRENCE KHOKHAR", license number, gender
- DOCX resumes still work exactly as before (no regression)
- Edge function deploys and runs without errors
