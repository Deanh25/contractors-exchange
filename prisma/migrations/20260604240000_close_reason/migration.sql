-- AlterTable
ALTER TABLE `listing` ADD COLUMN `closeReason` ENUM('sold_on_cx', 'sold_elsewhere', 'no_longer_available', 'other') NULL,
    ADD COLUMN `closeReasonNote` TEXT NULL;

