-- Make Follow party-aware: a company can follow (via acting-as), not just a user.
-- Additive column + widened unique key. MySQL-safe; existing rows get NULL company.
ALTER TABLE `Follow` ADD COLUMN `followerCompanyId` VARCHAR(191) NULL;

DROP INDEX `Follow_followerUserId_targetType_targetValue_key` ON `Follow`;

CREATE UNIQUE INDEX `Follow_followerUserId_followerCompanyId_targetType_targetVal_key` ON `Follow`(`followerUserId`, `followerCompanyId`, `targetType`, `targetValue`);

CREATE INDEX `Follow_followerCompanyId_idx` ON `Follow`(`followerCompanyId`);

ALTER TABLE `Follow` ADD CONSTRAINT `Follow_followerCompanyId_fkey` FOREIGN KEY (`followerCompanyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
