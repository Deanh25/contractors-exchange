-- CreateTable
CREATE TABLE `Post` (
    `id` VARCHAR(191) NOT NULL,
    `authorUserId` VARCHAR(191) NULL,
    `authorCompanyId` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `tradeTag` VARCHAR(191) NULL,
    `regionTag` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Post_tradeTag_idx`(`tradeTag`),
    INDEX `Post_regionTag_idx`(`regionTag`),
    INDEX `Post_authorUserId_idx`(`authorUserId`),
    INDEX `Post_authorCompanyId_idx`(`authorCompanyId`),
    INDEX `Post_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Follow` (
    `id` VARCHAR(191) NOT NULL,
    `followerUserId` VARCHAR(191) NOT NULL,
    `targetType` ENUM('trade', 'location', 'company', 'user') NOT NULL,
    `targetValue` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Follow_followerUserId_idx`(`followerUserId`),
    INDEX `Follow_targetType_targetValue_idx`(`targetType`, `targetValue`),
    UNIQUE INDEX `Follow_followerUserId_targetType_targetValue_key`(`followerUserId`, `targetType`, `targetValue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_authorUserId_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_authorCompanyId_fkey` FOREIGN KEY (`authorCompanyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Follow` ADD CONSTRAINT `Follow_followerUserId_fkey` FOREIGN KEY (`followerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
