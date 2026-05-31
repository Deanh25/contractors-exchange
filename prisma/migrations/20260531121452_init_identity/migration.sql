-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `bio` TEXT NULL,
    `trades` JSON NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `trades` JSON NULL,
    `serviceArea` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `logoUrl` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Company_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Membership` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `role` ENUM('owner', 'member') NOT NULL DEFAULT 'member',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Membership_companyId_idx`(`companyId`),
    UNIQUE INDEX `Membership_userId_companyId_key`(`userId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
