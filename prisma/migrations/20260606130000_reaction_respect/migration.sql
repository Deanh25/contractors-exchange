-- Rename ReactionType value `celebrate` -> `respect` (Lucide Award icon, green).
-- Three-step so existing rows survive: widen the enum, migrate rows, narrow it.
ALTER TABLE `Reaction` MODIFY COLUMN `type` ENUM('like', 'celebrate', 'insightful', 'respect', 'helpful') NOT NULL;

UPDATE `Reaction` SET `type` = 'respect' WHERE `type` = 'celebrate';

ALTER TABLE `Reaction` MODIFY COLUMN `type` ENUM('like', 'insightful', 'respect', 'helpful') NOT NULL;
