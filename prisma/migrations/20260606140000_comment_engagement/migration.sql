-- Comment engagement (Part B): image attachment, auto-tag mention, comment reactions.
-- Additive + MySQL-safe (new nullable columns + a new table); no backfill needed.

-- AlterTable
ALTER TABLE `Comment` ADD COLUMN `imageUrl` VARCHAR(191) NULL,
    ADD COLUMN `mentionedCompanyId` VARCHAR(191) NULL,
    ADD COLUMN `mentionedUserId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `CommentReaction` (
    `id` VARCHAR(191) NOT NULL,
    `commentId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `type` ENUM('like', 'insightful', 'respect', 'helpful') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `CommentReaction_commentId_idx`(`commentId`),
    UNIQUE INDEX `CommentReaction_commentId_userId_companyId_key`(`commentId`, `userId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Comment_mentionedUserId_idx` ON `Comment`(`mentionedUserId`);

-- CreateIndex
CREATE INDEX `Comment_mentionedCompanyId_idx` ON `Comment`(`mentionedCompanyId`);

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_mentionedUserId_fkey` FOREIGN KEY (`mentionedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_mentionedCompanyId_fkey` FOREIGN KEY (`mentionedCompanyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommentReaction` ADD CONSTRAINT `CommentReaction_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommentReaction` ADD CONSTRAINT `CommentReaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommentReaction` ADD CONSTRAINT `CommentReaction_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
