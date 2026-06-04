
-- AlterTable
ALTER TABLE `listing` ADD COLUMN `condition` ENUM('new', 'like_new', 'good', 'fair', 'salvage') NULL,
    ADD COLUMN `manufacturer` VARCHAR(191) NULL;

