CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`system_code` text NOT NULL,
	`customer_name` text DEFAULT '' NOT NULL,
	`customer_email` text DEFAULT '' NOT NULL,
	`plan` text DEFAULT 'trial' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workspaces_owner_user_id` ON `workspaces` (`owner_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workspaces_owner_code` ON `workspaces` (`owner_user_id`,`system_code`);--> statement-breakpoint
ALTER TABLE `chatbots` ADD `workspace_id` text REFERENCES workspaces(id);--> statement-breakpoint
PRAGMA optimize;
