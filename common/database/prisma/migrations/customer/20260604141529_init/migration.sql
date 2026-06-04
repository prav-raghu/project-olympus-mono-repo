-- CreateTable
CREATE TABLE `customer_profiles` (
    `id` VARCHAR(36) NOT NULL,
    `azure_oid` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(200) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,
    `created_by` VARCHAR(36) NOT NULL DEFAULT 'SYSTEM',
    `modified_by` VARCHAR(36) NOT NULL DEFAULT 'SYSTEM',

    UNIQUE INDEX `customer_profiles_azure_oid_key`(`azure_oid`),
    UNIQUE INDEX `customer_profiles_email_key`(`email`),
    INDEX `customer_profiles_is_active_idx`(`is_active`),
    INDEX `customer_profiles_created_at_id_idx`(`created_at` DESC, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
