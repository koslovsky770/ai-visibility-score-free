# AI Visibility Score — FREE (בדיקת דף בית)

גרסה חינמית, לצורכי שיווק ואיסוף לידים, של המוצר [AI Visibility Score](../תוכנה%20לבדיקת%20GEO) המלא. סורקת **רק את דף הבית** (לא את שאר האתר), נותנת ניתוח עשיר לפי מודל ניקוד עצמאי (`lib/freeCriteria.ts`, 5 קטגוריות, 100 נקודות), אוספת ליד (שם+מייל חובה), ומציעה מעבר לבדיקה המלאה ב-149 ₪ (כרגע כפתור placeholder — ר' `lib/config.ts`).

**זהו פרויקט נפרד לגמרי מהמוצר המלא — אין קשר קוד/ריפו/דיפלוי ביניהם.**

## הרצה מקומית

1. העתיקו את `.env.local.example` ל-`.env.local` והזינו מפתח מ-[console.anthropic.com](https://console.anthropic.com) בשדה `ANTHROPIC_API_KEY`.
2. `npm install`
3. `npm run dev` ופתחו את [http://localhost:3000](http://localhost:3000)

לידים שנאספים בזמן פיתוח מקומי נשמרים גם לקובץ `.leads.local.jsonl` (לא ב-git) — ר' `lib/leads.ts` להחלפה עתידית בחיבור MySQL אמיתי.

## מבנה

- `app/api/analyze/route.ts` — אורכיסטרציה: שמירת ליד → סריקת דף בית → מנוע כללים → ניתוח Claude → איחוד ציונים.
- `lib/freeCriteria.ts` — מקור האמת למודל הניקוד של דף הבית (5 קטגוריות, 100 נקודות). **שונה במכוון** ממודל הניקוד של המוצר המלא — לא בודק עומק תוכן של עמודים פנימיים, רק את דף הבית ואת ההפניות ממנו.
- `lib/homepageCrawler.ts` — סורק רק את דף הבית; ממפה קישורים פנימיים (`lib/pageDiscovery.ts` → `mapSiteLinks`) בלי להוריד את תוכנם.
- `lib/freeRuleEngine.ts` — בדיקות דטרמיניסטיות על דף הבית בלבד.
- `lib/freeLlmAnalysis.ts` — ניתוח סמנטי דרך Claude, עם הנחיה מפורשת לא להעניש דף בית על תוכן ששייך לעמודים פנימיים, ועם סיכום "מה ניתן להבין על העסק".
- `lib/freeAggregator.ts` — איחוד הציונים לדוח סופי.
- `lib/leads.ts` — שמירת לידים (placeholder עד לחיבור MySQL).
- `components/` — רכיבי תצוגת הדוח, כולל `BusinessSnapshot`, `SiteMapSummary`, `LimitsNotice`, `FullAuditCta`.
