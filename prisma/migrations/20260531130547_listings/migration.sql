-- CreateTable
CREATE TABLE `Listing` (
    `id` VARCHAR(191) NOT NULL,
    `ownerUserId` VARCHAR(191) NULL,
    `ownerCompanyId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `tradeCategory` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `description` TEXT NULL,
    `unit` VARCHAR(191) NULL,
    `freightNote` VARCHAR(191) NULL,
    `photos` JSON NULL,
    `type` ENUM('price', 'bid', 'trade') NOT NULL,
    `price` DECIMAL(12, 2) NULL,
    `startReserve` DECIMAL(12, 2) NULL,
    `closesAt` DATETIME(3) NULL,
    `tradeKind` ENUM('goods', 'service') NULL,
    `status` ENUM('active', 'sold', 'awarded', 'closed') NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Listing_tradeCategory_idx`(`tradeCategory`),
    INDEX `Listing_type_idx`(`type`),
    INDEX `Listing_status_idx`(`status`),
    INDEX `Listing_ownerUserId_idx`(`ownerUserId`),
    INDEX `Listing_ownerCompanyId_idx`(`ownerCompanyId`),
    INDEX `Listing_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Listing` ADD CONSTRAINT `Listing_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Listing` ADD CONSTRAINT `Listing_ownerCompanyId_fkey` FOREIGN KEY (`ownerCompanyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
