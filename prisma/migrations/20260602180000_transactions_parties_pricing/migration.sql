
-- DropForeignKey
ALTER TABLE `transaction` DROP FOREIGN KEY `Transaction_buyerId_fkey`;

-- DropForeignKey
ALTER TABLE `transaction` DROP FOREIGN KEY `Transaction_sellerId_fkey`;

-- DropIndex
DROP INDEX `Transaction_buyerId_idx` ON `transaction`;

-- DropIndex
DROP INDEX `Transaction_sellerId_idx` ON `transaction`;

-- AlterTable
ALTER TABLE `transaction` DROP COLUMN `buyerId`,
    DROP COLUMN `sellerId`,
    ADD COLUMN `buyerCompanyId` VARCHAR(191) NULL,
    ADD COLUMN `buyerPrice` DECIMAL(12, 2) NULL,
    ADD COLUMN `buyerType` ENUM('user', 'company') NOT NULL,
    ADD COLUMN `buyerUserId` VARCHAR(191) NULL,
    ADD COLUMN `margin` DECIMAL(12, 2) NULL,
    ADD COLUMN `sellerCompanyId` VARCHAR(191) NULL,
    ADD COLUMN `sellerNet` DECIMAL(12, 2) NULL,
    ADD COLUMN `sellerType` ENUM('user', 'company') NOT NULL,
    ADD COLUMN `sellerUserId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Transaction_buyerUserId_idx` ON `Transaction`(`buyerUserId`);

-- CreateIndex
CREATE INDEX `Transaction_buyerCompanyId_idx` ON `Transaction`(`buyerCompanyId`);

-- CreateIndex
CREATE INDEX `Transaction_sellerUserId_idx` ON `Transaction`(`sellerUserId`);

-- CreateIndex
CREATE INDEX `Transaction_sellerCompanyId_idx` ON `Transaction`(`sellerCompanyId`);

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_buyerUserId_fkey` FOREIGN KEY (`buyerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_buyerCompanyId_fkey` FOREIGN KEY (`buyerCompanyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_sellerUserId_fkey` FOREIGN KEY (`sellerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_sellerCompanyId_fkey` FOREIGN KEY (`sellerCompanyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

