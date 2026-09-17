<?php

/** Single PDO connection per request — this runs as a normal PHP request
 *  under PHP-FPM/Apache, not a long-lived process, so there's no
 *  connection-pooling concern to manage here. */
function get_db_connection(array $config): PDO
{
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $config['db_host'],
        $config['db_name'],
    );

    return new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

/** Inserts one lead row. Every value is bound as a parameter — never
 *  string-concatenated into the SQL. Returns the new row's id. */
function insert_lead(PDO $db, array $lead): int
{
    $sql = 'INSERT INTO leads (
        name, email, submitted_url, analyzed_url, business_name, field, region,
        marketing_consent, score, tier_label, cached, estimated_cost_usd,
        business_snapshot_json, full_report_json, created_at
    ) VALUES (
        :name, :email, :submitted_url, :analyzed_url, :business_name, :field, :region,
        :marketing_consent, :score, :tier_label, :cached, :estimated_cost_usd,
        :business_snapshot_json, :full_report_json, :created_at
    )';

    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':name' => $lead['name'],
        ':email' => $lead['email'],
        ':submitted_url' => $lead['submittedUrl'],
        ':analyzed_url' => $lead['analyzedUrl'] ?? null,
        ':business_name' => $lead['businessName'] ?? null,
        ':field' => $lead['field'] ?? null,
        ':region' => $lead['region'] ?? null,
        ':marketing_consent' => !empty($lead['marketingConsent']) ? 1 : 0,
        ':score' => $lead['score'],
        ':tier_label' => $lead['tierLabel'] ?? null,
        ':cached' => !empty($lead['cached']) ? 1 : 0,
        ':estimated_cost_usd' => $lead['estimatedCostUsd'] ?? 0,
        ':business_snapshot_json' => isset($lead['businessSnapshot']) ? json_encode($lead['businessSnapshot'], JSON_UNESCAPED_UNICODE) : null,
        ':full_report_json' => isset($lead['fullReport']) ? json_encode($lead['fullReport'], JSON_UNESCAPED_UNICODE) : null,
        ':created_at' => $lead['createdAt'] ?? gmdate('Y-m-d H:i:s'),
    ]);

    return (int) $db->lastInsertId();
}

/** Records whether the report email succeeded, for later review/resend. */
function mark_lead_email_result(PDO $db, int $leadId, bool $sent, ?string $error): void
{
    $stmt = $db->prepare(
        'UPDATE leads SET report_emailed_at = :emailed_at, report_email_error = :error WHERE id = :id',
    );
    $stmt->execute([
        ':emailed_at' => $sent ? gmdate('Y-m-d H:i:s') : null,
        ':error' => $error,
        ':id' => $leadId,
    ]);
}
