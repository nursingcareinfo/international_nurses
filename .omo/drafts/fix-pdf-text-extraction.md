---
slug: fix-pdf-text-extraction
status: awaiting-approval
intent: clear
pending-action: write .omo/plans/fix-pdf-text-extraction.md
approach: Add PDF text extraction to the extract-info edge function using unpdf library
---

# Draft: fix-pdf-text-extraction

## Components (topology ledger)
| id | outcome | status | evidence path |
| --- | --- | --- | --- |
| C1. unpdf PDF text extractor | Returns text content from text-based PDF files | active | `supabase/functions/extract-info/index.ts` |
| C2. Modified extraction loop | PDF text feeds into `combinedText` for all fallback strategies (Gemini, Cloudflare, Pollinations, regex) | active | `supabase/functions/extract-info/index.ts` lines 595-675 |
| C3. Deployed edge function v50 | Fix is live on Supabase | active | Supabase dashboard function version |

## Open assumptions (announced defaults)
| assumption | adopted default | rationale | reversible? |
| --- | --- | --- | --- |
| PDF library choice | `npm:unpdf` — specifically designed for Deno/serverless, avoids pdfjs-dist worker/global issues | Recommendation from research | Yes — swap library later |
| PDF text extraction only (no images) | Only extract text content from PDFs, not embedded images | Matches existing DOCX text extraction pattern; images from PDF are rare and complex | Yes — extend later |
| Extract text from ALL PDF files (not just CV) | If a PNC file is uploaded as PDF and fails AI extraction, fallback text extraction also runs | Symmetry with DOCX handling | Yes — can restrict later |

## Findings (cited - path:lines)
- F1. `supabase/functions/extract-info/index.ts` line 598: **Only `.docx`/`.doc` files get text extracted** via `extractDocxText()`. PDF files are skipped.
- F2. Same file, line 632-636: `combinedText` is populated ONLY from `docxTexts`. For PDF uploads, `combinedText` stays empty.
- F3. Same file, lines 661-674: **Pollinations AI fallback and regex fallback are both gated on `combinedText` being non-empty.** They're skipped entirely for PDF-only uploads.
- F4. Tested with Sharoon's PDF CV: Gemini returned empty, `combinedText` was empty → all fallbacks skipped → "No structured data" error.
- F5. In contrast, Alwin's DOCX resume succeeded because text was extracted and fed into `combinedText`, enabling all fallback strategies.
- F6. The `extractDocxText` function at line 144-243 is a dedicated text extraction function for DOCX — no equivalent exists for PDF.

## Decisions (with rationale)
| Decision | Choice | Rationale |
| --- | --- | --- |
| PDF library | `npm:unpdf` | Designed for Deno/serverless, lightweight, avoids pdfjs-dist worker/WebAssembly issues |
| Extraction placement | Add `extractPdfText()` alongside `extractDocxText()`, called in the file-processing loop | Maintains code symmetry, minimal diff |
| Combined text usage | Add extracted PDF text to both `docxTexts` (for Gemini prompt) and `combinedText` (for fallback strategies) | Matches existing DOCX pattern exactly |
| Imports style | `import { extractText } from "npm:unpdf"` | Consistent with existing `npm:mammoth` import pattern |
| No retrofitting to ocr-pnc function | The ocr-pnc function is PNC-card-only (always images), not affected | Scope containment |

## Scope IN
- Add `extractPdfText()` function to `supabase/functions/extract-info/index.ts`
- Modify the file-processing loop (lines 595-629) to call it for `.pdf` files
- Thread extracted PDF text into `docxTexts` and `combinedText` (same as DOCX text)
- Deploy updated edge function to Supabase

## Scope OUT (Must NOT have)
- No changes to `ocr-pnc` function (image-only, no PDF needed)
- No changes to Express `server.ts` (local dev mirror — will be updated separately if needed)
- No image extraction from PDFs (only text)
- No changes to the UI (`Hero.tsx`, `Survey.tsx`)
- No database schema changes

## Open questions
None — all forks resolved during exploration.

## Approval gate
status: awaiting-approval
