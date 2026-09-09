ALTER TABLE `channel_accounts` ADD `owner_user_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_channel_accounts_owner_user_id` ON `channel_accounts` (`owner_user_id`);--> statement-breakpoint
ALTER TABLE `chatbots` ADD `owner_user_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_chatbots_owner_user_id` ON `chatbots` (`owner_user_id`);--> statement-breakpoint
PRAGMA optimize;
