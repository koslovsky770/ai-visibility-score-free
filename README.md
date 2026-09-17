# AI Visibility Score — FREE (בדיקת דף בית)

גרסה חינמית, לצורכי שיווק ואיסוף לידים, של המוצר [AI Visibility Score](../תוכנה%20לבדיקת%20GEO) המלא. סורקת **רק את דף הבית** (לא את שאר האתר), נותנת ניתוח עשיר לפי מודל ניקוד עצמאי (`lib/freeCriteria.ts`, 5 קטגוריות, 100 נקודות), אוספת ליד (שם+מייל חובה), ומציעה מעבר לבדיקה המלאה ב-149 ₪ (כרגע כפתור placeholder — ר' `lib/config.ts`).

**זהו פרויקט נפרד לגמרי מהמוצר המלא — אין קשר קוד/ריפו/דיפלוי ביניהם.**

## הרצה מקומית

1. העתיקו את `.env.local.example` ל-`.env.local` והזינו מפתח מ-[console.anthropic.com](https://console.anthropic.com) בשדה `ANTHROPIC_API_KEY`.
2. (מומלץ, לא חובה) חברו "Upstash for Redis" ב-Vercel והעתיקו את `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` — בלעדיהם הגבלת השימוש והקאש כבויים (הכל נשאר פתוח).
3. (אופציונלי) הקימו את הגשר ל-MySQL/מייל לפי `cpanel-api/README.md` והעתיקו את `LEADS_API_URL`/`LEADS_API_KEY` — בלעדיהם לידים רק מודפסים ללוג ולקובץ מקומי, בלי שמירה קבועה או שליחת מייל.
4. `npm install`
5. `npm run dev` ופתחו את [http://localhost:3000](http://localhost:3000)

לידים שנאספים בזמן פיתוח מקומי נשמרים גם לקובץ `.leads.local.jsonl` (לא ב-git) — ר' `lib/leads.ts`. עלות כל בדיקה נרשמת ללוג עם הקידומת `COST_LOG` — ר' `lib/costLog.ts`.

## מבנה

- `app/api/analyze/route.ts` — אורכיסטרציה: שמירת ליד → סריקת דף בית → מנוע כללים → ניתוח Claude → איחוד ציונים.
- `lib/freeCriteria.ts` — מקור האמת למודל הניקוד של דף הבית (5 קטגוריות, 100 נקודות). **שונה במכוון** ממודל הניקוד של המוצר המלא — לא בודק עומק תוכן של עמודים פנימיים, רק את דף הבית ואת ההפניות ממנו.
- `lib/homepageCrawler.ts` — סורק רק את דף הבית; ממפה קישורים פנימיים (`lib/pageDiscovery.ts` → `mapSiteLinks`) בלי להוריד את תוכנם.
- `lib/freeRuleEngine.ts` — בדיקות דטרמיניסטיות על דף הבית בלבד.
- `lib/freeLlmAnalysis.ts` — ניתוח סמנטי דרך Claude (`claude-sonnet-5`, effort בינוני — זול יותר מהמוצר המלא בכוונה), עם הנחיה מפורשת לא להעניש דף בית על תוכן ששייך לעמודים פנימיים, ועם סיכום "מה ניתן להבין על העסק".
- `lib/freeAggregator.ts` — איחוד הציונים לדוח סופי.
- `lib/rateLimitAndCache.ts` — הגבלת שימוש (אימייל/דומיין/IP) וקאש תוצאות ב-Redis (Upstash). בלי חיבור Redis — לא פעיל.
- `lib/costLog.ts` — הערכת עלות בדולרים לכל בדיקה, נרשם ללוג.
- `lib/leads.ts` — שמירת לידים: מדפיס ללוג תמיד, ואם `LEADS_API_URL`/`LEADS_API_KEY` מוגדרים — שולח גם ל-API ב-`cpanel-api/` (MySQL + מייל ללקוח). בלעדיהם, no-op חינני בדיוק כמו Redis.
- `cpanel-api/` — קוד PHP שרץ מחוץ ל-Vercel, על ה-cPanel — גשר בין Vercel ל-MySQL (כי ל-Vercel אין IP קבוע) ושליחת מייל תוצאות ללקוח. ר' `cpanel-api/README.md` להתקנה.
- `components/` — רכיבי תצוגת הדוח, כולל `BusinessSnapshot`, `SiteMapSummary`, `FullAuditUpsell`.
