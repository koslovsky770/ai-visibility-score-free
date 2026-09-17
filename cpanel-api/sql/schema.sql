-- Run this once in phpMyAdmin (or the MySQL client) on the cPanel account,
-- inside the dedicated database created for this app (see README.md).

CREATE TABLE IF NOT EXISTS leads (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name                   VARCHAR(200)  NOT NULL,
  email                  VARCHAR(320)  NOT NULL,
  submitted_url          VARCHAR(500)  NOT NULL,
  analyzed_url           VARCHAR(500)  NULL,
  business_name          VARCHAR(200)  NULL,
  field                  VARCHAR(200)  NULL,
  region                 VARCHAR(200)  NULL,
  marketing_consent      TINYINT(1)    NOT NULL DEFAULT 0,
  score                  SMALLINT UNSIGNED NOT NULL,
  tier_label             VARCHAR(50)   NULL,
  cached                 TINYINT(1)    NOT NULL DEFAULT 0,
  estimated_cost_usd     DECIMAL(10,6) NOT NULL DEFAULT 0,
  business_snapshot_json JSON          NULL,
  full_report_json       JSON          NULL,
  report_emailed_at      DATETIME      NULL,
  report_email_error     VARCHAR(500)  NULL,
  created_at             DATETIME      NOT NULL,
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
