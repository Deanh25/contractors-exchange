-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `raterId` VARCHAR(191) NOT NULL,
    `rateeId` VARCHAR(191) NOT NULL,
    `stars` INTEGER NOT NULL,
    `body` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Review_rateeId_idx`(`rateeId`),
    INDEX `Review_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `Review_transactionId_raterId_key`(`transactionId`, `raterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_raterId_fkey` FOREIGN KEY (`raterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_rateeId_fkey` FOREIGN KEY (`rateeId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
