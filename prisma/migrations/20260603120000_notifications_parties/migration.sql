
-- DropForeignKey
ALTER TABLE `notification` DROP FOREIGN KEY `Notification_actorId_fkey`;

-- DropForeignKey
ALTER TABLE `notification` DROP FOREIGN KEY `Notification_userId_fkey`;

-- DropIndex
DROP INDEX `Notification_actorId_fkey` ON `notification`;

-- DropIndex
DROP INDEX `Notification_userId_createdAt_idx` ON `notification`;

-- DropIndex
DROP INDEX `Notification_userId_readAt_idx` ON `notification`;

-- AlterTable
ALTER TABLE `notification` DROP COLUMN `actorId`,
    DROP COLUMN `userId`,
    ADD COLUMN `actorCompanyId` VARCHAR(191) NULL,
    ADD COLUMN `actorUserId` VARCHAR(191) NULL,
    ADD COLUMN `recipientCompanyId` VARCHAR(191) NULL,
    ADD COLUMN `recipientUserId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Notification_recipientUserId_readAt_idx` ON `Notification`(`recipientUserId`, `readAt`);

-- CreateIndex
CREATE INDEX `Notification_recipientCompanyId_readAt_idx` ON `Notification`(`recipientCompanyId`, `readAt`);

-- CreateIndex
CREATE INDEX `Notification_createdAt_idx` ON `Notification`(`createdAt`);

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_recipientUserId_fkey` FOREIGN KEY (`recipientUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_recipientCompanyId_fkey` FOREIGN KEY (`recipientCompanyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_actorCompanyId_fkey` FOREIGN KEY (`actorCompanyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

