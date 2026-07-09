---
slug: nursing-outreach
status: awaiting-approval
intent: clear
pending-action: write .omo/plans/nursing-outreach.md
approach: Add Cloudflare Web Analytics + conversion event tracking, create shortened URLs per platform with UTM, write platform-specific outreach content driving nurses to upload PNC → complete survey, build a platform priority list, and track conversion funnel from visit → upload → survey complete.
---

# Draft: nursing-outreach

## Components (topology ledger)
| id | outcome | status | evidence path |
|---|---|---|---|
| C1 | Analytics + conversion tracking on site | active | Cloudflare Web Analytics + custom event on survey submission |
| C2 | Per-platform shortened URLs with click tracking | active | shorten.dev API, one URL per platform with UTM |
| C3 | Conversion-focused outreach content | active | Messages that drive the full funnel: upload PNC → survey, not just "visit site" |
| C4 | Platform priority list | active | Ranked by potential to deliver 1000+ survey-completing nurses |
| C5 | Conversion funnel tracking | active | Track: page view → PNC upload → /survey page → survey submit event |

## Open assumptions (announced defaults)
| assumption | adopted default | rationale | reversible? |
|---|---|---|---|
| Analytics provider | Cloudflare Web Analytics | Free, privacy-first, custom event tracking for conversions | Yes |
| URL shortener | shorten.dev | Free forever, per-URL click stats to compare platform performance | Yes |
| Conversion metric | Survey submission event tracked via CWA custom events | Know exactly which platform drives completed surveys, not just clicks | Yes |
| Outreach language | English with Urdu-friendly phrasing | Pakistani nursing audience, professional context | Yes |
| Target per platform | Prioritize platforms by size + engagement rate | WhatsApp/Telegram groups have highest conversion; FB groups have widest reach | Yes |

## Findings (cited - path:lines)
- No analytics exist in the codebase (grep: zero matches for gtag/ga/plausible/umami in *.ts,*.tsx,*.html)
- Survey route is at `/survey` (src/App.tsx:39) — can track visits to this route as conversion signal
- Survey submission posts to `callEdgeFunction("submit-complete", ...)` (Survey.tsx) — can add analytics event there
- GitHub API: repo has 3 unique visitors / 40 views in 14 days — current organic traffic is near zero
- Cloudflare Web Analytics supports custom click/event tracking via `data-cf-event` attributes
- Top Pakistani nursing platforms: WNESP (largest org), Pakistani Nurses FB group (wide reach), PMCI (targeted), WhatsApp/Telegram groups (highest engagement)

## Decisions (with rationale)
1. **Cloudflare Web Analytics with event tracking** — not just page views. Track: homepage visit → PNC upload click → survey page visit → survey submit. This tells you which platform drives survey completions, not just clicks.
2. **Per-platform URLs** — one shortened URL per platform, not one URL for all. So you know which platform sends the most survey-completing nurses.
3. **Conversion-first messaging** — every message template drives to the specific action: "Upload your PNC license → complete your profile survey in 5 minutes" not just "check out this site."
4. **WhatsApp/Telegram groups as top priority** — they have highest conversion rates for Pakistani audiences. Direct messages in nurse community groups convert better than public posts.
5. **Two-phase tracking** — Phase 1: site analytics + per-platform URL clicks. Phase 2 (after 2 weeks): analyze data to double down on best-performing platforms.

## Scope IN
- Add Cloudflare Web Analytics with custom event tracking for survey submission
- Create one shortened URL per target platform (5-8 URLs)
- Write 4+ platform-specific message templates driving survey completion
- Build priority platform list ranked by conversion potential
- Add UTM + platform-source tracking params
- Create a simple funnel dashboard (page views → uploads → survey starts → survey completes)

## Scope OUT (Must NOT have)
- No paid ads
- No automated posting / scraping / bots
- No backend changes
- No GDPR/cookie banner (CWA is cookieless)
- No social media account creation

## Open questions
None — outcome is now clear: 1000+ survey submissions from 1000+ nurses.

## Approval gate
status: awaiting-approval
<!-- User clarified: target is 1000+ nurses filling the survey form -->
