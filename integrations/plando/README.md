# חיבור לידים לפלנדו (CRM)

כל ליד נשלח לפלנדו כאיש קשר. אם כבר קיים איש קשר עם אותו אימייל, הוא מתעדכן ולא נוצר כפול. הקוד: `sendToPlando` ב-`lib/leads.ts`.

## מה נשלח
| פרמטר בפלנדו | ערך |
|---|---|
| `name`, `email` | מהטופס |
| `contact[remark]` | אתר שנבדק, ציון, דירוג ו-3 הפערים המרכזיים |
| `tags` | `AI Visibility FREE` |
| `approve_mailing` | 1 אם סומנה הסכמה לדיוור, אחרת 0 |
| `update_contact` | 1 (עדכון לפי אימייל במקום כפילות) |
| `no_redirect` | 1 (קריאת שרת, אין דפדפן להפנות) |

לפי תיעוד פלנדו: POST ל-`https://plando.co.il/contacts/lead_form1`, תשובה `{"err":"0","errdesc":"...","contact_id":"..."}`.

## משתני סביבה (Vercel → Settings → Environment Variables)
```
PLANDO_ACCESS_KEY      = <המפתח הייחודי לארגון — נשלח מפלנדו במייל>   (חובה)
PLANDO_LEAD_ORIGIN_ID  = <מזהה מספרי של "מקור ליד" בפלנדו>             (אופציונלי)
PLANDO_LEAD_STATUS_ID  = <מזהה מספרי של סטטוס תהליך בפלנדו>            (אופציונלי)
```
בלי `PLANDO_ACCESS_KEY` — השליחה לפלנדו מדולגת בשקט (הגיליון ממשיך לעבוד).
