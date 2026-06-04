-- AlterTable
ALTER TABLE `company` ADD COLUMN `suspended` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `suspended` BOOLEAN NOT NULL DEFAULT false;

