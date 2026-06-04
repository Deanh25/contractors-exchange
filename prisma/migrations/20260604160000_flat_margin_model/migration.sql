-- Corrected revenue model (PRD §7B revision): flat per-category margin %, no band,
-- no floor, no admin pricing-approval queue. Buyer price = net x (1 + marginPct/100);
-- buyer negotiation moves the net, not the margin.

-- CategoryMargin: collapse the band (defaultPct/minPct) to a single marginPct,
-- carrying the old defaultPct over as the flat margin.
ALTER TABLE `categorymargin` ADD COLUMN `marginPct` DOUBLE NOT NULL DEFAULT 0;
UPDATE `categorymargin` SET `marginPct` = `defaultPct`;
ALTER TABLE `categorymargin` MODIFY COLUMN `marginPct` DOUBLE NOT NULL;
ALTER TABLE `categorymargin` DROP COLUMN `defaultPct`, DROP COLUMN `minPct`;

-- Listing: drop the held-pricing fields (queue retired); add the negotiable flag.
ALTER TABLE `listing` DROP COLUMN `adminPricingNote`,
    DROP COLUMN `agreement`,
    DROP COLUMN `counterReason`,
    ADD COLUMN `acceptsOffers` BOOLEAN NOT NULL DEFAULT true;

-- Notification: remove the now-unused pricing_update type.
ALTER TABLE `notification` MODIFY `type` ENUM('message', 'order_new', 'order_update', 'review_new', 'follow_new', 'post_mention') NOT NULL;
