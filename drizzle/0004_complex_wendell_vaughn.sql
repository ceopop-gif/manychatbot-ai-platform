ALTER TABLE `admin_skills` ADD `routing_keywords` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_skills` ADD `minimum_confidence` integer DEFAULT 70 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `last_customer_message` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `routing_confidence` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `routing_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `human_takeover` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `human_agent_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `routed_at` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `admin_id` text REFERENCES admin_profiles(id);--> statement-breakpoint
ALTER TABLE `messages` ADD `skill_id` text REFERENCES admin_skills(id);--> statement-breakpoint
ALTER TABLE `messages` ADD `routing_reason` text DEFAULT '' NOT NULL;