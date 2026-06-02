-- AlterTable
ALTER TABLE `thread` ADD COLUMN `userALastReadAt` DATETIME(3) NULL,
    ADD COLUMN `userBLastReadAt` DATETIME(3) NULL;
