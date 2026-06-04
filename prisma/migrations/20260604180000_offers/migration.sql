-- AlterTable
ALTER TABLE `notification` MODIFY `type` ENUM('message', 'order_new', 'order_update', 'review_new', 'follow_new', 'post_mention', 'offer_new', 'offer_update') NOT NULL;

-- CreateTable
CREATE TABLE `Offer` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `buyerType` ENUM('user', 'company') NOT NULL,
    `buyerUserId` VARCHAR(191) NULL,
    `buyerCompanyId` VARCHAR(191) NULL,
    `fromSide` ENUM('buyer', 'seller') NOT NULL,
    `buyerPrice` DECIMAL(12, 2) NOT NULL,
    `sellerNet` DECIMAL(12, 2) NOT NULL,
    `marginPct` DOUBLE NOT NULL,
    `message` TEXT NULL,
    `status` ENUM('pending', 'accepted', 'declined', 'countered', 'withdrawn') NOT NULL DEFAULT 'pending',
    `parentId` VARCHAR(191) NULL,
    `threadId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Offer_listingId_status_idx`(`listingId`, `status`),
    INDEX `Offer_buyerUserId_idx`(`buyerUserId`),
    INDEX `Offer_buyerCompanyId_idx`(`buyerCompanyId`),
    INDEX `Offer_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_buyerUserId_fkey` FOREIGN KEY (`buyerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_buyerCompanyId_fkey` FOREIGN KEY (`buyerCompanyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

