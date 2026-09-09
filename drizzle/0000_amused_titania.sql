CREATE TABLE `channel_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`chatbot_id` text NOT NULL,
	`platform` text NOT NULL,
	`account_name` text NOT NULL,
	`external_id` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`unread_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`chatbot_id`) REFERENCES `chatbots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_channel_accounts_chatbot_id` ON `channel_accounts` (`chatbot_id`);--> statement-breakpoint
CREATE INDEX `idx_channel_accounts_platform` ON `channel_accounts` (`platform`);--> statement-breakpoint
CREATE TABLE `chatbots` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`business_system` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`greeting` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
PRAGMA optimize;
