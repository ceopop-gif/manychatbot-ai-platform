CREATE TABLE `admin_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'AI Admin' NOT NULL,
	`department` text DEFAULT 'บริการลูกค้า' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`color` text DEFAULT 'cyan' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`is_fallback` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_admin_profiles_owner_workspace` ON `admin_profiles` (`owner_user_id`,`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_admin_profiles_status` ON `admin_profiles` (`status`);--> statement-breakpoint
CREATE TABLE `admin_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`admin_id` text NOT NULL,
	`name` text NOT NULL,
	`objective` text DEFAULT '' NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`knowledge` text DEFAULT '' NOT NULL,
	`tone` text DEFAULT 'สุภาพ กระชับ เป็นมืออาชีพ' NOT NULL,
	`escalation_rules` text DEFAULT '' NOT NULL,
	`prohibited_topics` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`admin_id`) REFERENCES `admin_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_admin_skills_admin_status` ON `admin_skills` (`admin_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_admin_skills_owner_workspace` ON `admin_skills` (`owner_user_id`,`workspace_id`);--> statement-breakpoint
CREATE TABLE `ai_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`provider` text NOT NULL,
	`name` text NOT NULL,
	`model` text NOT NULL,
	`base_url` text DEFAULT '' NOT NULL,
	`api_key_encrypted` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`temperature` integer DEFAULT 30 NOT NULL,
	`max_output_tokens` integer DEFAULT 700 NOT NULL,
	`last_tested_at` text,
	`last_error` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ai_providers_owner_workspace` ON `ai_providers` (`owner_user_id`,`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_providers_workspace_default` ON `ai_providers` (`workspace_id`,`is_default`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`chatbot_id` text NOT NULL,
	`channel_account_id` text NOT NULL,
	`platform` text NOT NULL,
	`external_user_id` text NOT NULL,
	`customer_name` text DEFAULT 'ลูกค้า' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`assigned_admin_id` text,
	`skill_id` text,
	`ai_enabled` integer DEFAULT true NOT NULL,
	`unread_count` integer DEFAULT 0 NOT NULL,
	`sentiment` text DEFAULT 'neutral' NOT NULL,
	`last_message_preview` text DEFAULT '' NOT NULL,
	`last_message_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chatbot_id`) REFERENCES `chatbots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_account_id`) REFERENCES `channel_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_admin_id`) REFERENCES `admin_profiles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`skill_id`) REFERENCES `admin_skills`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_conversations_channel_customer` ON `conversations` (`channel_account_id`,`external_user_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_owner_workspace_last` ON `conversations` (`owner_user_id`,`workspace_id`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `idx_conversations_status_assignee` ON `conversations` (`status`,`assigned_admin_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`direction` text NOT NULL,
	`sender_type` text NOT NULL,
	`sender_name` text DEFAULT '' NOT NULL,
	`content` text NOT NULL,
	`external_message_id` text DEFAULT '' NOT NULL,
	`delivery_status` text DEFAULT 'received' NOT NULL,
	`ai_provider_id` text,
	`model` text DEFAULT '' NOT NULL,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`prompt_tokens` integer DEFAULT 0 NOT NULL,
	`completion_tokens` integer DEFAULT 0 NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`skill_version` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ai_provider_id`) REFERENCES `ai_providers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_created` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_messages_owner_created` ON `messages` (`owner_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_messages_external_id` ON `messages` (`external_message_id`);--> statement-breakpoint
ALTER TABLE `channel_accounts` ADD `channel_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `channel_accounts` ADD `channel_secret_encrypted` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `channel_accounts` ADD `access_token_encrypted` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `channel_accounts` ADD `webhook_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `channel_accounts` ADD `admin_id` text REFERENCES admin_profiles(id);--> statement-breakpoint
ALTER TABLE `channel_accounts` ADD `ai_provider_id` text REFERENCES ai_providers(id);--> statement-breakpoint
ALTER TABLE `channel_accounts` ADD `auto_reply` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `channel_accounts` ADD `connected_at` text;--> statement-breakpoint
ALTER TABLE `channel_accounts` ADD `last_webhook_at` text;--> statement-breakpoint
CREATE INDEX `idx_channel_accounts_webhook_key` ON `channel_accounts` (`webhook_key`);--> statement-breakpoint
CREATE INDEX `idx_chatbots_workspace_id` ON `chatbots` (`workspace_id`);--> statement-breakpoint
PRAGMA optimize;
