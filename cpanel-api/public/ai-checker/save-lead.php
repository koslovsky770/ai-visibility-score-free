<?php

declare(strict_types=1);

// Never leak PHP errors/stack traces into the HTTP response — every
// failure path below returns a clean JSON error instead.
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/lib/Db.php';
require __DIR__ . '/lib/Mailer.php';

// vendor/autoload.php is Composer's autoloader (if PHPMailer was installed
// via `composer require phpmailer/phpmailer`). If it isn't available,
// fall back to manually-vendored PHPMailer source files — see README.md.
$autoload = __DIR__ . '/../../vendor/autoload.php';
if (is_file($autoload)) {
    require $autoload;
} else {
    require __DIR__ . '/../../vendor/phpmailer/src/Exception.php';
    require __DIR__ . '/../../vendor/phpmailer/src/PHPMailer.php';
    require __DIR__ . '/../../vendor/phpmailer/src/SMTP.php';
}

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

// config.php lives one level above the web-servable `public/` folder (or is
// protected by .htaccess if that isn't possible on this hosting plan) — see
// README.md for the exact layout and the fallback.
$configPath = __DIR__ . '/../../config.php';
if (!is_file($configPath)) {
    respond(500, ['ok' => false, 'error' => 'server not configured']);
}
$config = require $configPath;

// --- Auth: checked before any DB or mail work ---
$providedKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
if (!hash_equals($config['api_key'], $providedKey)) {
    respond(401, ['ok' => false, 'error' => 'unauthorized']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method not allowed']);
}

$raw = file_get_contents('php://input');
$lead = json_decode($raw, true);
if (!is_array($lead)) {
    respond(400, ['ok' => false, 'error' => 'invalid JSON body']);
}

$required = ['name', 'email', 'submittedUrl', 'score', 'createdAt'];
foreach ($required as $field) {
    if (!isset($lead[$field]) || $lead[$field] === '') {
        respond(400, ['ok' => false, 'error' => "missing field: {$field}"]);
    }
}
if (!filter_var($lead['email'], FILTER_VALIDATE_EMAIL)) {
    respond(400, ['ok' => false, 'error' => 'invalid email']);
}

try {
    $db = get_db_connection($config);
} catch (Throwable $e) {
    error_log('ai-checker save-lead: DB connection failed: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'database unavailable']);
}

try {
    $leadId = insert_lead($db, $lead);
} catch (Throwable $e) {
    error_log('ai-checker save-lead: insert failed: ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'failed to save lead']);
}

// Email failure must never undo the (already-committed) lead insert — the
// saved lead is the priority, a missed email is recoverable later via
// report_email_error.
$emailSent = false;
$emailError = null;
try {
    send_report_email($config, $lead);
    $emailSent = true;
} catch (Throwable $e) {
    $emailError = $e->getMessage();
    error_log('ai-checker save-lead: email failed: ' . $emailError);
}

try {
    mark_lead_email_result($db, $leadId, $emailSent, $emailError);
} catch (Throwable $e) {
    error_log('ai-checker save-lead: failed to record email result: ' . $e->getMessage());
}

respond(200, [
    'ok' => true,
    'leadId' => $leadId,
    'emailSent' => $emailSent,
    'emailError' => $emailError,
]);
