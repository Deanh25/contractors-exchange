
-- AlterTable
ALTER TABLE `notification` MODIFY `type` ENUM('message', 'order_new', 'order_update', 'review_new', 'follow_new', 'post_mention') NOT NULL;

-- CreateTable
CREATE TABLE `PostTag` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `taggedUserId` VARCHAR(191) NULL,
    `taggedCompanyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PostTag_postId_idx`(`postId`),
    INDEX `PostTag_taggedUserId_idx`(`taggedUserId`),
    INDEX `PostTag_taggedCompanyId_idx`(`taggedCompanyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PostTag` ADD CONSTRAINT `PostTag_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTag` ADD CONSTRAINT `PostTag_taggedUserId_fkey` FOREIGN KEY (`taggedUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostTag` ADD CONSTRAINT `PostTag_taggedCompanyId_fkey` FOREIGN KEY (`taggedCompanyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

