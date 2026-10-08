# חיבור לידים לגוגל שיט

כל ליד שמגיע לאתר נוסף כשורה בגיליון, דרך Google Apps Script שמשמש כ-webhook. הקוד בצד Next.js נמצא ב-`lib/leads.ts` (`sendToGoogleSheets`).

## התקנה (פעם אחת, כ-5 דקות)

1. צרי גיליון חדש ב-Google Sheets (למשל "לידים — AI Visibility FREE").
2. בגיליון: **Extensions → Apps Script**.
3. מחקי את הקוד שמופיע שם, והדביקי את כל התוכן של `apps-script.gs`.
4. בשורה `const SECRET = "..."` החליפי את הטקסט במחרוזת סודית ארוכה (למשל 32+ תווים אקראיים). שמרי (Ctrl+S).
5. **Deploy → New deployment** → סוג **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy → אשרי הרשאות (Google יציג אזהרה "app isn't verified" כי זה סקריפט שלך — Advanced → Go to ... → Allow).
6. העתיקי את ה-**Web app URL** (נגמר ב-`/exec`).
7. ב-Vercel → הפרויקט → Settings → Environment Variables:
   ```
   GOOGLE_SHEETS_WEBHOOK_URL    = <ה-URL מסעיף 6>
   GOOGLE_SHEETS_WEBHOOK_SECRET = <אותו סוד בדיוק מסעיף 4>
   ```
   ואז Redeploy (משתני סביבה נכנסים לתוקף רק בדיפלוי הבא).

הלשונית "לידים" וכותרות העמודות נוצרות אוטומטית בליד הראשון.

## הערות
- "Anyone" אומר שכל אחד עם ה-URL יכול לפנות לסקריפט — אבל בלי הסוד הוא מקבל `unauthorized` ושום דבר לא נכתב.
- **שינוי בקוד הסקריפט** מחייב Deploy → Manage deployments → עריכה → Version: New version. אחרת ה-URL ממשיך להריץ את הגרסה הישנה.
- כישלון בשליחה לשיט לעולם לא פוגע בגולש — הוא כבר רואה את הדוח. השגיאה נרשמת בלוג של Vercel.
