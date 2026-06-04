-- AlterTable
ALTER TABLE `listing` ADD COLUMN `adminPricingNote` TEXT NULL,
    MODIFY `agreement` ENUM('agreed', 'pending_admin', 'pending_seller') NULL;

-- AlterTable
ALTER TABLE `notification` MODIFY `type` ENUM('message', 'order_new', 'order_update', 'review_new', 'follow_new', 'post_mention', 'pricing_update') NOT NULL;

