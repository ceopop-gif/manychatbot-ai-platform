CREATE TABLE `payment_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`reference` text NOT NULL,
	`customer_name` text DEFAULT '' NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`amount_satang` integer NOT NULL,
	`currency` text DEFAULT 'THB' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`checkout_url` text DEFAULT '' NOT NULL,
	`transaction_id` text DEFAULT '' NOT NULL,
	`expires_at` text,
	`paid_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payment_orders_reference` ON `payment_orders` (`reference`);--> statement-breakpoint
CREATE INDEX `idx_payment_orders_owner_workspace_created` ON `payment_orders` (`owner_user_id`,`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_payment_orders_workspace_status` ON `payment_orders` (`workspace_id`,`status`);--> statement-breakpoint
CREATE TABLE `payment_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`provider` text DEFAULT 'chatpos' NOT NULL,
	`merchant_id` text DEFAULT '' NOT NULL,
	`checkout_base_url` text DEFAULT 'https://chatpospay.com' NOT NULL,
	`webhook_secret_encrypted` text DEFAULT '' NOT NULL,
	`mode` text DEFAULT 'test' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payment_profiles_workspace` ON `payment_profiles` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_payment_profiles_owner` ON `payment_profiles` (`owner_user_id`);--> statement-breakpoint
DROP INDEX `idx_channel_accounts_workspace_line`;--> statement-breakpoint
CREATE INDEX `idx_channel_accounts_workspace_platform` ON `channel_accounts` (`workspace_id`,`platform`);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `customer_phone` text DEFAULT '' NOT NULL;