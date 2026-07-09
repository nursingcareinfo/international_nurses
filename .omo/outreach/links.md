# Platform-Specific Tracking Links

Base URL: `https://nursingcareinfo.github.io/international_nurses/survey`

## Short URLs + UTM Tags

| Platform | Short URL | UTM Source | UTM Medium | UTM Campaign |
|----------|-----------|------------|------------|--------------|
| WhatsApp | `tinyurl.com/nurse-survey-wa` | `whatsapp` | `social` | `survey-1000` |
| Facebook | `tinyurl.com/nurse-survey-fb` | `facebook` | `social` | `survey-1000` |
| Telegram | `tinyurl.com/nurse-survey-tg` | `telegram` | `social` | `survey-1000` |
| Instagram | `tinyurl.com/nurse-survey-ig` | `instagram` | `social` | `survey-1000` |
| LinkedIn | `tinyurl.com/nurse-survey-li` | `linkedin` | `professional` | `survey-1000` |
| YouTube | `tinyurl.com/nurse-survey-yt` | `youtube` | `video` | `survey-1000` |
| Agency Sites | `tinyurl.com/nurse-survey-agency` | `agency` | `referral` | `survey-1000` |
| QR Flyer | `tinyurl.com/nurse-survey-qr` | `qr-code` | `offline` | `survey-1000` |
| Direct (no UTM) | `tinyurl.com/nurse-survey` | — | — | `survey-1000` |

## Full URLs (for reference)

Each short URL redirects to:
```
https://nursingcareinfo.github.io/international_nurses/survey?utm_source={platform}&utm_medium={medium}&utm_campaign=survey-1000
```

### How to Create Short URLs
1. Go to [tinyurl.com](https://tinyurl.com) (free, no login for basic)
   - Paste the full UTM URL above
   - Custom alias: `nurse-survey-wa`, `nurse-survey-fb`, etc.
2. OR use [bit.ly](https://bit.ly) (free with account, has click tracking)
3. OR use [shorturl.at](https://shorturl.at) (no account needed)

### Tracking
- Each `survey_submit` event in the analytics_events table includes the `utm_source`
- Query: `SELECT platform, COUNT(*) FROM analytics_events WHERE event_name = 'survey_submit' GROUP BY platform;`
