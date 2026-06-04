-- CreateTable
CREATE TABLE `ListingView` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `viewerUserId` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ListingView_listingId_createdAt_idx`(`listingId`, `createdAt`),
    INDEX `ListingView_viewerUserId_idx`(`viewerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ListingView` ADD CONSTRAINT `ListingView_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingView` ADD CONSTRAINT `ListingView_viewerUserId_fkey` FOREIGN KEY (`viewerUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

