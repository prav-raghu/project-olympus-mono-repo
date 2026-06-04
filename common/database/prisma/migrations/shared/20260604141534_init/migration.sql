-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,
    `created_by` VARCHAR(36) NOT NULL DEFAULT 'SYSTEM',
    `modified_by` VARCHAR(36) NOT NULL DEFAULT 'SYSTEM',

    UNIQUE INDEX `roles_name_key`(`name`),
    INDEX `roles_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_statuses` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,
    `created_by` VARCHAR(36) NOT NULL DEFAULT 'SYSTEM',
    `modified_by` VARCHAR(36) NOT NULL DEFAULT 'SYSTEM',

    UNIQUE INDEX `user_statuses_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_subscriptions` (
    `id` VARCHAR(36) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `secret` VARCHAR(512) NOT NULL,
    `events` LONGTEXT NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `retry_count` INTEGER NOT NULL DEFAULT 3,
    `timeout_seconds` INTEGER NOT NULL DEFAULT 30,
    `created_by` VARCHAR(36) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,
    `last_triggered_at` DATETIME(0) NULL,

    INDEX `webhook_subscriptions_is_active_idx`(`is_active`),
    INDEX `webhook_subscriptions_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_deliveries` (
    `id` VARCHAR(36) NOT NULL,
    `subscription_id` VARCHAR(36) NOT NULL,
    `event_type` VARCHAR(200) NOT NULL,
    `payload` JSON NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `http_status` INTEGER NULL,
    `response_body` LONGTEXT NULL,
    `error_message` LONGTEXT NULL,
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `next_retry_at` DATETIME(0) NULL,
    `delivered_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `webhook_deliveries_subscription_id_idx`(`subscription_id`),
    INDEX `webhook_deliveries_status_idx`(`status`),
    INDEX `webhook_deliveries_event_type_idx`(`event_type`),
    INDEX `webhook_deliveries_created_at_idx`(`created_at`),
    INDEX `webhook_deliveries_next_retry_at_idx`(`next_retry_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `webhook_deliveries` ADD CONSTRAINT `webhook_deliveries_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `webhook_subscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
