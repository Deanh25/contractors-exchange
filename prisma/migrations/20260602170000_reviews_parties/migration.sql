
-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `Review_rateeId_fkey`;

-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `Review_raterId_fkey`;

-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `Review_transactionId_fkey`;

-- DropIndex
DROP INDEX `Review_rateeId_idx` ON `review`;

-- DropIndex
DROP INDEX `Review_raterId_fkey` ON `review`;

-- DropIndex
DROP INDEX `Review_transactionId_raterId_key` ON `review`;

-- AlterTable
ALTER TABLE `review` DROP COLUMN `rateeId`,
    DROP COLUMN `raterId`,
    ADD COLUMN `rateeCompanyId` VARCHAR(191) NULL,
    ADD COLUMN `rateeUserId` VARCHAR(191) NULL,
    ADD COLUMN `raterCompanyId` VARCHAR(191) NULL,
    ADD COLUMN `raterUserId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `Review_rateeUserId_idx` ON `Review`(`rateeUserId`);

-- CreateIndex
CREATE INDEX `Review_rateeCompanyId_idx` ON `Review`(`rateeCompanyId`);

-- CreateIndex
CREATE UNIQUE INDEX `Review_transactionId_raterUserId_key` ON `Review`(`transactionId`, `raterUserId`);

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_raterUserId_fkey` FOREIGN KEY (`raterUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_raterCompanyId_fkey` FOREIGN KEY (`raterCompanyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_rateeUserId_fkey` FOREIGN KEY (`rateeUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_rateeCompanyId_fkey` FOREIGN KEY (`rateeCompanyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

