# Funnel Tracking Guide

## What We Track

| Event | When It Fires | What We Learn |
|-------|---------------|---------------|
| `page_view` | Every page load | How many people visit the survey per platform |
| `survey_submit` | After successful submission | How many completed surveys per platform |

## Conversion Funnel

```
Visits (page_view)
  │
  ▼
[User uploads PNC / fills survey]
  │
  ▼
Survey Submits (survey_submit)
```

## How to Check Results

### Option 1: Supabase Dashboard (Recommended)

1. Go to [Supabase](https://supabase.com/dashboard) → Your Project → **Table Editor**
2. Select `analytics_events` table
3. Run this query to see per-platform results:

```sql
SELECT
  COALESCE(utm_source, platform, 'direct') AS source,
  COUNT(*) FILTER (WHERE event_name = 'page_view') AS visits,
  COUNT(*) FILTER (WHERE event_name = 'survey_submit') AS completions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_name = 'survey_submit') /
    NULLIF(COUNT(*) FILTER (WHERE event_name = 'page_view'), 0),
    1
  ) AS conversion_pct
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY source
ORDER BY visits DESC;
```

### Option 2: Quick Daily Check

```sql
SELECT DATE(created_at) AS day, event_name, COUNT(*)
FROM analytics_events
GROUP BY day, event_name
ORDER BY day DESC;
```

### Option 3: Total Progress to 1,000

```sql
SELECT COUNT(*) AS total_completed
FROM analytics_events
WHERE event_name = 'survey_submit';
```

## When to Post

| Day | Action | Check |
|-----|--------|-------|
| After posting | Share link in first platform group | Check `page_view` events after 1 hour |
| Next day | Follow up in same group | Check if `survey_submit` events appeared |
| End of week | Review all platforms | Run per-platform query, focus on highest conversion rate |

## Target: 1,000 Surveys

- Average conversion rate: ~15-25% (visit → submit)
- Target visits needed: ~4,000-6,000
- Post in 3+ platforms per week minimum

## Simple Rules
1. Each platform gets its own short URL (different UTM source)
2. Never share the direct link without UTM params
3. Check the table once a week
4. If conversion dips below 10%, try a different message template
