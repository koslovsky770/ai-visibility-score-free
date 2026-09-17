<?php

use PHPMailer\PHPMailer\PHPMailer;

/**
 * Sends the free-check results to the lead's email address using the
 * cPanel account's own mailbox over SMTP (no third-party email service).
 * Content is intentionally a static summary — the app has no shareable
 * "view my report" URL yet, so the email can't deep-link to a live result.
 * Returns true on success; throws on failure so the caller can record the
 * error against the lead row without ever failing the whole request.
 */
function send_report_email(array $config, array $lead): void
{
    $mail = new PHPMailer(true);

    $mail->isSMTP();
    $mail->Host = $config['smtp_host'];
    $mail->SMTPAuth = true;
    $mail->Username = $config['smtp_user'];
    $mail->Password = $config['smtp_pass'];
    $mail->SMTPSecure = $config['smtp_secure'];
    $mail->Port = $config['smtp_port'];
    $mail->CharSet = 'UTF-8';

    $mail->setFrom($config['from_email'], $config['from_name']);
    $mail->addAddress($lead['email'], $lead['name']);

    $businessLabel = $lead['businessName'] ?: ($lead['analyzedUrl'] ?? $lead['submittedUrl']);
    $mail->Subject = "התוצאות שלך: ציון הנראות ל-AI — {$businessLabel}";

    $gaps = [];
    if (!empty($lead['fullReport']['whatIsMissing']) && is_array($lead['fullReport']['whatIsMissing'])) {
        foreach (array_slice($lead['fullReport']['whatIsMissing'], 0, 3) as $item) {
            if (!empty($item['label'])) {
                $gaps[] = $item['label'];
            }
        }
    }
    $gapsHtml = $gaps
        ? '<ul>' . implode('', array_map(fn($g) => '<li>' . htmlspecialchars($g, ENT_QUOTES, 'UTF-8') . '</li>', $gaps)) . '</ul>'
        : '';

    $score = (int) $lead['score'];
    $tier = htmlspecialchars($lead['tierLabel'] ?? '', ENT_QUOTES, 'UTF-8');
    $name = htmlspecialchars($lead['name'], ENT_QUOTES, 'UTF-8');

    $mail->isHTML(true);
    $mail->Body = <<<HTML
    <div dir="rtl" style="font-family: Arial, sans-serif; font-size: 15px; color: #0f172a; line-height: 1.6;">
        <p>היי {$name},</p>
        <p>תודה שבדקת את הנראות של האתר שלך ל-AI. הציון שלך: <strong>{$score}/100</strong> — {$tier}.</p>
        {$gapsHtml}
        <p>אם תרצו לראות את התמונה המלאה — בדיקה מעמיקה של האתר, זיהוי הפערים המדויקים ותוכנית פעולה —
        אפשר לחזור אלינו ולבקש את הדוח המלא (149 ₪).</p>
        <p>בברכה,<br>{$config['from_name']}</p>
    </div>
    HTML;
    $mail->AltBody = "היי {$name}, הציון שלך: {$score}/100 ({$tier}). תודה שבדקת איתנו!";

    $mail->send(); // throws PHPMailerException on failure
}
