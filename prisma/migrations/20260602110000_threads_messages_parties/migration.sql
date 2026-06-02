
-- DropForeignKey
ALTER TABLE `message` DROP FOREIGN KEY `Message_senderId_fkey`;

-- DropForeignKey
ALTER TABLE `thread` DROP FOREIGN KEY `Thread_userAId_fkey`;

-- DropForeignKey
ALTER TABLE `thread` DROP FOREIGN KEY `Thread_userBId_fkey`;

-- DropIndex
DROP INDEX `Message_senderId_fkey` ON `message`;

-- DropIndex
DROP INDEX `Thread_userAId_idx` ON `thread`;

-- DropIndex
DROP INDEX `Thread_userAId_userBId_listingId_key` ON `thread`;

-- DropIndex
DROP INDEX `Thread_userBId_idx` ON `thread`;

-- AlterTable
ALTER TABLE `message` DROP COLUMN `senderId`,
    ADD COLUMN `senderCompanyId` VARCHAR(191) NULL,
    ADD COLUMN `senderUserId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `thread` DROP COLUMN `userAId`,
    DROP COLUMN `userALastReadAt`,
    DROP COLUMN `userBId`,
    DROP COLUMN `userBLastReadAt`,
    ADD COLUMN `aCompanyId` VARCHAR(191) NULL,
    ADD COLUMN `aLastReadAt` DATETIME(3) NULL,
    ADD COLUMN `aType` ENUM('user', 'company') NOT NULL,
    ADD COLUMN `aUserId` VARCHAR(191) NULL,
    ADD COLUMN `bCompanyId` VARCHAR(191) NULL,
    ADD COLUMN `bLastReadAt` DATETIME(3) NULL,
    ADD COLUMN `bType` ENUM('user', 'company') NOT NULL,
    ADD COLUMN `bUserId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Thread_aUserId_idx` ON `Thread`(`aUserId`);

-- CreateIndex
CREATE INDEX `Thread_aCompanyId_idx` ON `Thread`(`aCompanyId`);

-- CreateIndex
CREATE INDEX `Thread_bUserId_idx` ON `Thread`(`bUserId`);

-- CreateIndex
CREATE INDEX `Thread_bCompanyId_idx` ON `Thread`(`bCompanyId`);

-- CreateIndex
CREATE UNIQUE INDEX `Thread_aType_aUserId_aCompanyId_bType_bUserId_bCompanyId_lis_key` ON `Thread`(`aType`, `aUserId`, `aCompanyId`, `bType`, `bUserId`, `bCompanyId`, `listingId`);

-- AddForeignKey
ALTER TABLE `Thread` ADD CONSTRAINT `Thread_aUserId_fkey` FOREIGN KEY (`aUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Thread` ADD CONSTRAINT `Thread_aCompanyId_fkey` FOREIGN KEY (`aCompanyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Thread` ADD CONSTRAINT `Thread_bUserId_fkey` FOREIGN KEY (`bUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Thread` ADD CONSTRAINT `Thread_bCompanyId_fkey` FOREIGN KEY (`bCompanyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_senderUserId_fkey` FOREIGN KEY (`senderUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_senderCompanyId_fkey` FOREIGN KEY (`senderCompanyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

