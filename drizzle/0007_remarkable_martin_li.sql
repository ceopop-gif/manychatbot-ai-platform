CREATE TABLE `admin_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`admin_id` text NOT NULL,
	`file_name` text NOT NULL,
	`content` text NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`admin_id`) REFERENCES `admin_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_admin_documents_admin_updated` ON `admin_documents` (`admin_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_admin_documents_owner_workspace` ON `admin_documents` (`owner_user_id`,`workspace_id`);