<?php
// Copy this file to config.php (same folder), fill in real values, and
// upload ONLY config.php to the server — never commit config.php to git.
// It must live outside the web-servable document root if possible; see
// README.md for the recommended layout and the .htaccess fallback.

return [
    // Long random string — generate with e.g. `openssl rand -hex 32`.
    // Must match LEADS_API_KEY in Vercel's environment variables exactly.
    'api_key' => 'REPLACE_WITH_A_LONG_RANDOM_SECRET',

    // MySQL — from cPanel → MySQL® Databases, after creating a dedicated
    // database + user scoped only to that database.
    'db_host' => 'localhost',
    'db_name' => 'REPLACE_cpaneluser_aichecker',
    'db_user' => 'REPLACE_cpaneluser_aichecker',
    'db_pass' => 'REPLACE_WITH_DB_PASSWORD',

    // SMTP — an existing or newly-created mailbox on this same cPanel
    // account (cPanel → Email Accounts). Port 465 = SSL, 587 = STARTTLS.
    'smtp_host'   => 'mail.odesign.co.il',
    'smtp_user'   => 'reports@odesign.co.il',
    'smtp_pass'   => 'REPLACE_WITH_MAILBOX_PASSWORD',
    'smtp_port'   => 465,
    'smtp_secure' => 'ssl',
    'from_email'  => 'reports@odesign.co.il',
    'from_name'   => 'Odesign — ציון הנראות ל-AI',
];
