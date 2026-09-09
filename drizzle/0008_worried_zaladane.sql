ALTER TABLE `admin_documents` ADD `file_type` text DEFAULT 'markdown' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_documents` ADD `mime_type` text DEFAULT 'text/markdown' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_documents` ADD `storage_key` text;--> statement-breakpoint
ALTER TABLE `admin_documents` ADD `page_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_documents` ADD `is_truncated` integer DEFAULT false NOT NULL;