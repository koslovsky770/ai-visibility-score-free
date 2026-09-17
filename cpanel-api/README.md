# ai-checker-api — PHP + MySQL bridge (cPanel)

קוד שרץ **לא** ב-Vercel אלא על ה-cPanel שלך (odesign.co.il), ומטרתו לגשר בין
אפליקציית ה-FREE ב-Vercel לבין MySQL — כי ל-Vercel אין IP קבוע ביציאה, ואי
אפשר (ולא כדאי) לפתוח את ה-MySQL שלך לאינטרנט. במקום זה: Vercel שולחת בקשת
HTTPS רגילה (מוגנת במפתח סודי) לקובץ PHP שרץ כאן, שמדבר עם MySQL רק דרך
`localhost` ושולח את המייל ללקוח.

ר' `C:\Users\User\.claude\plans\purrfect-prancing-stroustrup.md` בהתקנה שלך
(אצל Claude) לתוכנית המלאה עם ההנמקה. הקובץ הזה הוא רק הוראות התקנה בפועל.

## מבנה
```
cpanel-api/
  config.example.php   ← להעתיק ל-config.php ולמלא סודות אמיתיים (לא בגיט!)
  composer.json        ← תלות ב-PHPMailer
  sql/schema.sql        ← להריץ פעם אחת ב-phpMyAdmin
  htaccess-fallback-if-under-public_html  ← לשנות שם ל-.htaccess אם צריך (ר' למטה)
  public/ai-checker/
    save-lead.php       ← ה-endpoint היחיד
    lib/Db.php
    lib/Mailer.php
```

## שלבי התקנה (לפי הסדר)

### 1. מסד נתונים
cPanel → **MySQL® Databases**:
- צרי מסד חדש, למשל `aichecker` (cPanel יוסיף אוטומטית את קידומת המשתמש שלך, למשל `odelyades_aichecker`).
- צרי משתמש MySQL **חדש וייעודי** (לא המשתמש הראשי שלך) עם סיסמה חזקה.
- שייכי את המשתמש למסד עם **All Privileges** — רק על המסד הזה, לא על מסדים אחרים.

### 2. טבלה
cPanel → **phpMyAdmin** → בחרי את המסד החדש → לשונית SQL → הדביקי את תוכן `sql/schema.sql` → Go.

### 3. תיבת מייל לשליחה
cPanel → **Email Accounts** → אם אין לך כבר, צרי תיבה כמו `reports@odesign.co.il` (או השתמשי בתיבה קיימת). תצטרכי את הסיסמה שלה בהמשך.

### 4. Subdomain
cPanel → **Subdomains** → צרי `api.odesign.co.il`.
אם האפשרות קיימת (רוב התוכניות), הגדירי את ה-Document Root **מחוץ** ל-`public_html` — למשל `~/ai-checker-api/public`. זה עדיף כי אז `config.php` (עם הסודות) לא נגיש דרך הדפדפן בכלל, גם בלי `.htaccess`.
אם זה לא אפשרי בתוכנית שלך — הגדירי את ה-subdomain בתוך `public_html` (למשל `public_html/ai-checker-api/public`), והמשיכי לסעיף "Fallback" למטה.

### 5. Composer / PHPMailer
בדקי אם יש לך גישת **Terminal/SSH** ב-cPanel:
- **אם כן**: התחברי, `cd` לתיקיית `ai-checker-api` (שהעלית — ר' שלב 6), והריצי `composer install`.
- **אם לא**: הורידי ZIP של [PHPMailer מ-GitHub](https://github.com/PHPMailer/PHPMailer/releases) (הכי עדכני, 6.x), וחלצי את תיקיית `src/` לתוך `vendor/phpmailer/src/` (כלומר הקבצים `PHPMailer.php`, `SMTP.php`, `Exception.php` יהיו ב-`ai-checker-api/vendor/phpmailer/src/`). `save-lead.php` כבר יודע לזהות את שני המצבים אוטומטית.

### 6. העלאת הקבצים
דרך File Manager או FTP/SFTP, בהתאם למבנה שבחרת בשלב 4:
```
~/ai-checker-api/config.php        ← מ-config.example.php, עם סודות אמיתיים
~/ai-checker-api/public/ai-checker/save-lead.php
~/ai-checker-api/public/ai-checker/lib/Db.php
~/ai-checker-api/public/ai-checker/lib/Mailer.php
~/ai-checker-api/vendor/...
```
**חשוב**: אל תעלי את `config.php` עם סודות אמיתיים דרך git — רק ידנית, ישירות לשרת.

**Fallback** (אם ה-subdomain חייב לשבת בתוך `public_html`): שני `htaccess-fallback-if-under-public_html` ל-`.htaccess` ושימי אותו **באותה תיקייה** שבה `config.php` יושב, כדי שגישה ישירה אליו מהדפדפן תיחסם (403).

### 7. בדיקה ישירה (לפני שנוגעים ב-Vercel בכלל)
```bash
# מפתח שגוי — אמור להחזיר 401
curl -X POST https://api.odesign.co.il/ai-checker/save-lead.php \
  -H "X-Api-Key: WRONG" -H "Content-Type: application/json" -d '{}'

# מפתח נכון, נתונים מינימליים — אמור להחזיר 200 עם leadId
curl -X POST https://api.odesign.co.il/ai-checker/save-lead.php \
  -H "X-Api-Key: <המפתח האמיתי מ-config.php>" \
  -H "Content-Type: application/json" \
  -d '{"name":"בדיקה","email":"test@example.com","submittedUrl":"https://example.com","score":50,"createdAt":"2026-01-01T00:00:00.000Z"}'
```
בדקי ב-phpMyAdmin שהשורה נוצרה, ושהמייל הגיע (כולל תיקיית ספאם).

### 8. חיבור ל-Vercel
Vercel → הפרויקט `ai-visibility-score-free` → Settings → Environment Variables:
```
LEADS_API_URL = https://api.odesign.co.il/ai-checker/save-lead.php
LEADS_API_KEY = <אותו מפתח בדיוק מ-config.php>
```
ואותו דבר ב-`.env.local` המקומי (לא ב-git — ר' `.env.local.example`).

זהו — הקוד ב-`lib/leads.ts` כבר בנוי לזהות את המשתנים האלה ולהתחיל להשתמש בהם אוטומטית, בלי שינוי נוסף.

## אבטחה — תזכורת
- `config.php` לעולם לא בגיט (מוגן ב-`.gitignore`).
- כל שאילתת SQL דרך PDO עם prepared statements בלבד.
- MySQL נשאר `localhost`-בלבד — אין צורך ולא כדאי להפעיל Remote MySQL.
- מפתח ה-API נבדק לפני כל פעולה אחרת ב-`save-lead.php`.
