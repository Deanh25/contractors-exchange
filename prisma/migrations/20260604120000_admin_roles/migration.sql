-- Replace the single isAdmin boolean with a privilege level (PRD §7C).
-- Add the new column, carry existing admins over as superadmin, then drop the old flag.

-- AlterTable: add the role column
ALTER TABLE `user`
    ADD COLUMN `adminRole` ENUM('none', 'moderator', 'admin', 'superadmin') NOT NULL DEFAULT 'none';

-- Backfill: any existing admin becomes a superadmin
UPDATE `user` SET `adminRole` = 'superadmin' WHERE `isAdmin` = true;

-- AlterTable: drop the old flag
ALTER TABLE `user` DROP COLUMN `isAdmin`;
