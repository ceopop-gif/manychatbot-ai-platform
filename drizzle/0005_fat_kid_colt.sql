ALTER TABLE `admin_profiles` ADD `gender` text DEFAULT 'unspecified' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_profiles` ADD `age` integer DEFAULT 28 NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_profiles` ADD `avatar_id` text DEFAULT 'avatar-01' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_profiles` ADD `personality` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_profiles` ADD `customer_typing_style` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_skills` ADD `compiled_markdown` text DEFAULT '' NOT NULL;