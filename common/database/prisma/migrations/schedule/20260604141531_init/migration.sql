-- CreateTable
CREATE TABLE `scheduled_jobs` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `cron_expr` VARCHAR(100) NOT NULL,
    `payload` JSON NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `last_run_at` DATETIME(0) NULL,
    `next_run_at` DATETIME(0) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,
    `created_by` VARCHAR(36) NOT NULL DEFAULT 'SYSTEM',
    `modified_by` VARCHAR(36) NOT NULL DEFAULT 'SYSTEM',

    INDEX `scheduled_jobs_status_is_active_idx`(`status`, `is_active`),
    INDEX `scheduled_jobs_next_run_at_idx`(`next_run_at`),
    INDEX `scheduled_jobs_created_at_id_idx`(`created_at` DESC, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
