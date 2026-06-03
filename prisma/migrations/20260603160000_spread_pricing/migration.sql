
-- AlterTable
ALTER TABLE `listing` ADD COLUMN `agreement` ENUM('agreed', 'pending_admin') NULL,
    ADD COLUMN `counterReason` TEXT NULL,
    ADD COLUMN `lastRepricedAt` DATETIME(3) NULL,
    ADD COLUMN `listedAt` DATETIME(3) NULL,
    ADD COLUMN `marginPct` DOUBLE NULL,
    ADD COLUMN `sellerNet` DECIMAL(12, 2) NULL;

-- CreateTable
CREATE TABLE `CategoryMargin` (
    `id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `defaultPct` DOUBLE NOT NULL,
    `minPct` DOUBLE NOT NULL,
    `maxPct` DOUBLE NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CategoryMargin_category_key`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

