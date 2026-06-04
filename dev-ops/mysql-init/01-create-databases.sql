CREATE DATABASE IF NOT EXISTS app_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS app_customer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS app_schedule CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS app_shared CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS app_cms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON app_admin.* TO 'appuser'@'%';
GRANT ALL PRIVILEGES ON app_customer.* TO 'appuser'@'%';
GRANT ALL PRIVILEGES ON app_schedule.* TO 'appuser'@'%';
GRANT ALL PRIVILEGES ON app_shared.* TO 'appuser'@'%';
GRANT ALL PRIVILEGES ON app_cms.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
