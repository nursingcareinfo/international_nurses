# nursing-outreach - Work Plan

**Target: 1000+ nurses → complete the survey form**

## TL;DR (For humans)

**What you'll get:** Click tracking that tells you exactly which platform sends nurses who actually fill out the survey (not just look at the page). One shortened link per platform so you can compare performance. Ready-to-post messages crafted to drive the full funnel: "Upload your PNC license → complete your profile in 5 minutes." A priority hit-list ranked by which platforms will deliver the most survey-completing nurses.

**Why this approach:** Free tools ($0). Cloudflare Web Analytics tracks both visits AND custom events — so you'll know how many people from each platform: (a) visit the site, (b) upload their PNC, (c) start the survey, (d) submit it. That's your conversion funnel.

**What it will NOT do:** No auto-posting bots, no paid ads, no backend changes, no cookies/GDPR popup.

**Effort:** Short
**Risk:** Low
**Decisions I made for you:**
  - Cloudflare Web Analytics (free, cookieless, custom event tracking for conversions)
  - shorten.dev for per-platform shortened URLs (free, per-link click stats)
  - WhatsApp/Telegram groups ranked as highest conversion priority (highest engagement rate for Pakistani audience)
  - Custom event on survey submission = your "success" metric (not just page views)

Your next move: **Approve** — then I'll build everything.

---

> TL;DR (machine): effort=short, risk=low, 7 todos. Target = 1000+ survey completions. Add CWA analytics + custom survey-submit event, create per-platform short URLs, write conversion-focused outreach messages (WhatsApp, FB, forum, LinkedIn), build platform priority list ranked by conversion potential, add UTM tracking per platform, create funnel tracking dashboard.

## Scope
### Must have
- Cloudflare Web Analytics beacon on all pages
- Custom event tracking on survey form submission (so you know which submissions came from which platform)
- One shortened URL per platform (5-8 URLs) — measure which platform converts
- 4+ platform-specific outreach message templates driving survey completion
- Priority platform list ranked by estimated conversion potential (not just reach)
- UTM parameters on every shared link
- Funnel tracking doc: how to read visits → uploads → survey completes per platform

### Must NOT have (guardrails, anti-slop, scope boundaries)
- No paid ads
- No automated posting / scraping / bots
- No backend changes
- No cookie consent banner
- No social media account creation
- No deceptive claims about job guarantees

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Deploy to GitHub Pages → verify CWA beacon loads via Chrome DevTools network tab
- Verify custom event fires on survey submission via browser console
- Verify each shortened URL redirects correctly (curl for each)
- Funnel doc present with interpretable metrics

## Execution strategy
### Parallel execution waves
Wave 1: T1 (analytics) + T2 (short URLs) — independent
Wave 2: T3 (outreach messages) + T4 (platform list) — parallel
Wave 3: T5 (UTM per platform) + T6 (funnel tracking doc) — parallel after T2-T4
Wave 4: T7 (deploy + verify)

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| T1. CWA analytics + event | — | T7 | T2, T3, T4 |
| T2. Per-platform short URLs | — | T5, T6 | T1, T3, T4 |
| T3. Outreach messages | — | T5 | T1, T2, T4 |
| T4. Platform priority list | — | T5, T6 | T1, T2, T3 |
| T5. UTM links per platform | T2, T3, T4 | T7 | T6 |
| T6. Funnel tracking doc | T2, T4 | T7 | T5 |
| T7. Deploy + verify | T1, T5 | — | — |

## Todos

- [ ] 1. Add Cloudflare Web Analytics beacon + survey-submit custom event to index.html and Survey.tsx
  What to do / Must NOT do:
    a) Add CWA script tag to `<head>` in `index.html`:
       `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>`
       Replace YOUR_TOKEN with actual token after user signs up at dash.cloudflare.com (or leave as placeholder with clear instructions).
    b) Add a custom analytics event in Survey.tsx that fires on successful survey submission. Add an `onSubmit` callback that calls:
       `window.__cfBeacon?.trackEvent?.({ eventName: "survey_submit", source: new URLSearchParams(window.location.search).get("utm_source") || "direct" })`
    c) Must NOT modify any other component. Must NOT add cookie banner. Must NOT block page rendering if analytics fails.
  Parallelization: Wave 1 | Blocked by: — | Blocks: T7
  References: `index.html` line 11 (before `</head>`), `src/components/Survey.tsx` (find the submit handler), Cloudflare Web Analytics API docs for custom events
  Acceptance criteria: After deploy, navigate to site → Chrome DevTools Network tab shows `beacon.min.js` loaded. Submit survey → verify `__cfBeacon.trackEvent` called with `eventName: "survey_submit"`.
  QA scenarios: happy — beacon loads, custom event fires on survey submit. failure — beacon blocked by adblock: site still works, no console errors. Evidence .omo/evidence/task-1-nursing-outreach.md
  Commit: Y | feat: add Cloudflare Web Analytics with survey-submit conversion tracking

- [ ] 2. Create per-platform shortened URLs via shorten.dev API
  What to do / Must NOT do: For each target platform (WNESP, FB group, PMCI, Apex Nursing, PNCK, OET WhatsApp, Nurses Beyond Borders, Global Nurse Guide, general), create a unique shortened URL. Base URL: `https://nursingcareinfo.github.io/international_nurses/`. Each gets UTM params added by T5. For now, create the shortened base URLs.
  API: `curl -X POST https://shorten.dev/api/create -H "Content-Type: application/json" -d '{"url":"<full-url>"}'`
  Must NOT use paid services. Must NOT use services requiring accounts. Fallback to zip1.io if shorten.dev is down.
  Save results in `.omo/outreach/short-urls.json` with platform → short_url mapping.
  Parallelization: Wave 1 | Blocked by: — | Blocks: T5, T6
  References: shorten.dev API, research output
  Acceptance criteria: `short-urls.json` has 8+ entries, each URL resolves to the nursing portal (verify with curl -L -o /dev/null -w '%{url_effective}').
  QA scenarios: happy — all URLs created and redirect correctly. failure — API rate limit: stagger requests 1s apart, retry once. Evidence .omo/evidence/task-2-nursing-outreach.json
  Commit: N (metadata, no code change)

- [ ] 3. Write 4 conversion-focused outreach message templates
  What to do / Must NOT do: Write messages that drive nurses to complete the SURVEY, not just visit. Each must include:
    - The problem: "Pakistani nurses looking for international jobs — this is free"
    - The action: "Upload your PNC license + CV → complete your 5-min profile survey"
    - The outcome: "Get matched with jobs in UK, UAE, Saudi, Canada, Australia, etc."
    - The trust signal: "Zero upfront cost — you pay only when you get your appointment letter"
    - The short URL: placeholder %%SHORT_URL%%
  Templates needed:
    a) **WhatsApp/Telegram short** (2-3 lines, urgent tone, emoji-friendly) — for direct group sharing
    b) **Facebook group post** (3-4 paragraphs, engaging question hook, call-to-action) — for Pakistani Nurses FB
    c) **Forum/community post** (professional, detailed, bullet points) — for WNESP, PMCI, PNCK
    d) **LinkedIn post** (professional, stat-driven, career-focused) — for professional networks
  Must NOT make false job guarantees. Must mention PNC license is mandatory (sets correct expectation). Must NOT use all-caps or spammy language.
  Parallelization: Wave 2 | Blocked by: — | Blocks: T5
  References: Site features (Hero.tsx, Survey.tsx), countries (10+), zero-cost badge, PNC license requirement
  Acceptance criteria: 4 files in `.omo/outreach/messages/` with %%SHORT_URL%% placeholders, ready to copy-paste
  QA scenarios: Each message reviewed for accuracy against actual site features. Evidence .omo/evidence/task-3-nursing-outreach/
  Commit: Y | feat: add conversion-focused outreach messages for nursing platforms

- [ ] 4. Build platform priority list ranked by conversion potential
  What to do / Must NOT do: Create `.omo/outreach/platforms.md` with each platform ranked by how many survey completions it can drive (not just total members). Ranking criteria: member count × engagement rate × permission to post recruitment content.
  Must include ALL of:
    HIGH: WhatsApp/Telegram nursing groups (highest conversion), Pakistani Nurses Facebook group (10K+ members), WNESP (largest Pakistani nursing org)
    MEDIUM: PMCI (targeted NCLEX audience), Apex Nursing (US-focused), PNCK (Gulf-focused), OET-Nursing WhatsApp
    LOW: Nurses Beyond Borders, Global Nurse Guide blog, PKN blog, individual nursing influencers
  For each: platform name, URL, priority, estimated reach, posting requirements (free? approval needed?), best message template to use, and time-to-first-post estimate.
  Must NOT recommend any platform that requires payment for posting.
  Parallelization: Wave 2 | Blocked by: — | Blocks: T5, T6
  References: Nursing platforms research output
  Acceptance criteria: File exists with 10+ platforms, each with priority rank, URL, posting instructions, and message template mapping
  QA scenarios: Verify every researched platform is included, priorities match conversion potential. Evidence .omo/evidence/task-4-nursing-outreach.md
  Commit: Y | feat: add nursing platform outreach priority list with conversion ranking

- [ ] 5. Generate UTM-link table per platform per message
  What to do / Must NOT do: For each platform in T4, apply UTM params to its short URL from T2:
    `?utm_source={platform-slug}&utm_medium={channel}&utm_campaign=survey-outreach-2026-07&utm_content={template-id}`
  Create `.omo/outreach/tracking-links.md` as a table:
    Platform | Short URL | Full URL with UTM | Message Template | Notes
  Must NOT add UTM to the original long URL — apply UTM to the destination the short URL redirects to. Actually, simpler: apply UTM to the original URL, THEN shorten it. So each short URL has baked-in UTM params.
  Parallelization: Wave 3 | Blocked by: T2, T3, T4 | Blocks: T7
  References: UTM best practices, platform list, short URLs
  Acceptance criteria: Table has 8+ rows, each UTM URL resolves correctly, parameters visible in destination page
  QA scenarios: Click each link → verify UTM params appear in browser URL bar → verify site loads normally. Evidence .omo/evidence/task-5-nursing-outreach.md
  Commit: Y | feat: add UTM tracking link table for nursing survey outreach

- [ ] 6. Create funnel tracking interpretation doc
  What to do / Must NOT do: Create `.omo/outreach/funnel-tracking.md` explaining how to measure success toward the 1000+ survey completions goal:
    a) How to read Cloudflare Web Analytics dashboard (page views → unique visitors → referrers)
    b) How to find the survey_submit custom event in CWA
    c) How to calculate funnel: visitors from Platform X → survey starts → survey completes
    d) How to compare platform performance (which short URL has highest → survey completion rate)
    e) Target: 1000+ survey_submit events = SUCCESS
    f) Timeline expectation (based on posting frequency, group sizes)
  Must NOT require any paid tool access. Must be interpretable by a non-technical person.
  Parallelization: Wave 3 | Blocked by: T2, T4 | Blocks: T7
  References: Cloudflare Web Analytics dashboard docs, survey_submit event from T1
  Acceptance criteria: File exists, non-technical user can follow it to measure campaign success
  QA scenarios: Verify all instructions are tool-specific and actionable. Evidence .omo/evidence/task-6-nursing-outreach.md
  Commit: Y | feat: add funnel tracking guide for nursing outreach campaign

- [ ] 7. Deploy to GitHub Pages and verify everything live
  What to do / Must NOT do:
    a) Commit all changes (T1, T3, T4, T5, T6)
    b) Push to origin/main
    c) Wait for GitHub Actions deploy to complete
    d) Verify via chrome-devtools: beacon loads, no console errors
    e) Verify via chrome-devtools: survey-submit event fires on test submission
    f) Verify each shortened URL redirects correctly
  Must NOT deploy with placeholder tokens that would break analytics.
  Parallelization: Wave 4 | Blocked by: T1, T5 | Blocks: —
  References: Previous deploy pattern (git push → GH Actions → verify)
  Acceptance criteria: All verification steps pass. Report: "Site deployed, analytics live, all short URLs working."
  QA scenarios: Full flow test via chrome-devtools. Evidence .omo/evidence/task-7-nursing-outreach.md
  Commit: N (all commits done in earlier tasks — this is the push)

## Final verification wave
- [ ] F1. Plan compliance audit — all 7 todos complete, no scope creep
- [ ] F2. Code quality — index.html beacon valid, Survey.tsx custom event clean, no console errors
- [ ] F3. Live QA — deploy, verify beacon loads, verify custom event fires, verify each short URL works
- [ ] F4. Scope fidelity — no paid ads, no bots, no cookies, no backend changes, no false claims

## Commit strategy
4 commits:
1. `feat: add Cloudflare Web Analytics with survey-submit conversion tracking` (index.html, Survey.tsx)
2. `feat: add conversion-focused outreach messages for nursing platforms` (.omo/outreach/messages/)
3. `feat: add nursing platform outreach priority list with conversion ranking` (.omo/outreach/platforms.md)
4. `feat: add UTM tracking links and funnel guide for survey outreach` (.omo/outreach/tracking-links.md, .omo/outreach/funnel-tracking.md)

## Success criteria
- **Cloudflare Web Analytics** loads on every page with survey_submit custom event tracking
- **8+ shortened URLs** (one per platform) each redirecting to the site with UTM params
- **4 message templates** ready to copy-paste, driving the full upload→survey funnel
- **10+ nursing platforms** cataloged with posting instructions, ranked by estimated survey completion potential
- **Funnel tracking guide** that lets you measure: Platform X sent Y visitors → Z completed surveys
- **Target: 1000+ survey_submit events** = campaign success
