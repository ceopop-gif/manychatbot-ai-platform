ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "message_type" text DEFAULT 'text' NOT NULL;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "media_key" text DEFAULT '' NOT NULL;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "media_content_type" text DEFAULT '' NOT NULL;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "sticker_package_id" text DEFAULT '' NOT NULL;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "sticker_id" text DEFAULT '' NOT NULL;
