-- ==============================================================================
-- MIGRATION SCRIPT: PITR_ER (Point-In-Time-Recovery & Audit Trail Ledger System)
-- Target Database : unpak_sijamu / unpak_sijamu_server2 (MySQL / MariaDB)
-- Generated Date  : 2026-11-16
-- Scope           : Outbox Schema Versioning, Audit Ledger SHA-256 Chain, 
--                   Multi-Table Checkpoint Snapshot, Anomaly Guardian Engine
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. UPGRADE TABEL: outbox_messages
-- Menambahkan kolom schema versioning, aggregate tracking, dan status processing
-- ------------------------------------------------------------------------------

-- Periksa dan tambahkan kolom pada outbox_messages jika belum ada
ALTER TABLE `outbox_messages`
  ADD COLUMN IF NOT EXISTS `schema_version` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `type`,
  ADD COLUMN IF NOT EXISTS `aggregate_type` VARCHAR(64) NULL AFTER `schema_version`,
  ADD COLUMN IF NOT EXISTS `aggregate_id` VARCHAR(64) NULL AFTER `aggregate_type`,
  ADD COLUMN IF NOT EXISTS `status` ENUM('PENDING','PROCESSED','FAILED') NOT NULL DEFAULT 'PENDING' AFTER `payload`,
  ADD COLUMN IF NOT EXISTS `retry_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `status`;

-- Tambahkan indeks pendukung performa outbox worker
ALTER TABLE `outbox_messages`
  ADD INDEX IF NOT EXISTS `idx_outbox_status_ver` (`status`, `schema_version`, `occurred_on_utc`),
  ADD INDEX IF NOT EXISTS `idx_outbox_aggregate` (`aggregate_type`, `aggregate_id`);


-- ------------------------------------------------------------------------------
-- 2. TABEL BARU: audit_logs (Audit Trail Ledger dengan SHA-256 Cryptographic Chain)
-- Menyimpan seluruh mutasi transaksi yang telah divalidasi dengan rantai hash anti-tamper
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(36) NOT NULL,
  `sequence_no` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `outbox_message_id` VARCHAR(36) DEFAULT NULL,
  `category` VARCHAR(64) NOT NULL,
  `action_type` VARCHAR(32) NOT NULL,
  `headline` VARCHAR(255) NOT NULL,
  `entity_type` VARCHAR(64) NOT NULL,
  `entity_id` VARCHAR(64) NOT NULL,
  `actor_id` VARCHAR(64) NOT NULL,
  `actor_name` VARCHAR(128) NOT NULL,
  `actor_role` VARCHAR(64) NOT NULL,
  `actor_unit` VARCHAR(128) DEFAULT NULL,
  `client_ip` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `diff_payload` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`diff_payload`)),
  `metadata` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `schema_version` INT UNSIGNED NOT NULL DEFAULT 1,
  `prev_hash` CHAR(64) NOT NULL COMMENT 'SHA-256 hash dari baris audit sebelumnya (Genesis: 64 nol)',
  `current_hash` CHAR(64) NOT NULL COMMENT 'SHA-256(prev_hash + sequence_no + diff_payload + actor_id + created_at)',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sequence_no` (`sequence_no`),
  INDEX `idx_audit_entity` (`entity_type`, `entity_id`, `created_at`),
  INDEX `idx_audit_actor` (`actor_id`, `created_at`),
  INDEX `idx_audit_chain` (`sequence_no`, `current_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Immutability Audit Ledger with Cryptographic Hash Chain';


-- ------------------------------------------------------------------------------
-- 3. TABEL BARU: audit_checkpoints (Jangkar Baseline & Point-In-Time-Recovery)
-- Menyimpan snapshot keadaan penuh database untuk 5 tabel inti guna cold-start & PITR
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `audit_checkpoints` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `type` ENUM('BASELINE','SCHEDULED','MANUAL_PRE_MIGRATION') NOT NULL DEFAULT 'BASELINE',
  `entity_type` VARCHAR(64) NOT NULL COMMENT 'matrix_proker, aktivitas_v2, aktivitasv2_rab, dll',
  `last_audit_sequence_no` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `state_snapshot` LONGTEXT NOT NULL COMMENT 'Full serialized JSON array snapshot of live table records',
  `state_hash` CHAR(64) NOT NULL COMMENT 'SHA-256 state hash of table snapshot',
  `created_by` VARCHAR(64) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `idx_cp_entity` (`entity_type`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Baseline and Point-In-Time Recovery Checkpoints';


-- ------------------------------------------------------------------------------
-- 4. TABEL BARU: audit_anomalies (Tiket Temuan Pelanggaran / Fraud / Invarian)
-- Menyimpan anomali yang ditemukan oleh Rule Engine Deterministik maupun AI Guardian
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `audit_anomalies` (
  `id` VARCHAR(36) NOT NULL,
  `rule_code` VARCHAR(64) NOT NULL COMMENT 'UNAUTHORIZED_FIELD_MUTATION, FSM_ILLEGAL_ANGGARAN_STATUS, etc.',
  `rule_category` ENUM('INTEGRITY','FINANCIAL','WORKFLOW_FSM','SECURITY','FRAUD_DETECTION') NOT NULL,
  `severity` ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  `entity_type` VARCHAR(64) NOT NULL,
  `entity_id` VARCHAR(64) NOT NULL,
  `audit_log_id` VARCHAR(36) DEFAULT NULL,
  `description` TEXT NOT NULL,
  `evidence_payload` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`evidence_payload`)),
  `status` ENUM('DETECTED','INVESTIGATING','RECONCILED','FALSE_POSITIVE') NOT NULL DEFAULT 'DETECTED',
  `detected_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `resolved_at` DATETIME(6) DEFAULT NULL,
  `resolved_by` VARCHAR(64) DEFAULT NULL,
  `resolution_notes` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_anom_status` (`status`, `severity`, `detected_at`),
  INDEX `idx_anom_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit Anomaly Findings and Reconciliation Tracker';


-- ------------------------------------------------------------------------------
-- 5. KONFIGURASI DEFAULT: app_settings (Audit Guardian Settings)
-- Menyimpan preferensi mode deteksi: rule_engine (Tanpa AI), ai_guardian, hybrid
-- ------------------------------------------------------------------------------

INSERT INTO `app_settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES (
  'audit_guardian_config',
  '{"mode":"rule_engine","ai_provider":"gemini","ai_model":"gemini-2.5-flash","ai_api_key":"","is_active":true,"check_fsm":true,"check_budget_math":true,"check_hash_chain":true,"check_unregistered_mutation":true,"updated_at":"2026-11-16 12:00:00"}',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `updated_at` = NOW();

SET FOREIGN_KEY_CHECKS = 1;
