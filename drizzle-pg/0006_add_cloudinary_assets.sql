ALTER TABLE "admin_documents" ADD COLUMN IF NOT EXISTS "cloudinary_public_id" text;
ALTER TABLE "admin_documents" ADD COLUMN IF NOT EXISTS "cloudinary_url" text;
ALTER TABLE "admin_documents" ADD COLUMN IF NOT EXISTS "cloudinary_resource_type" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "cloudinary_public_id" text DEFAULT '' NOT NULL;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "cloudinary_url" text DEFAULT '' NOT NULL;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "cloudinary_resource_type" text DEFAULT '' NOT NULL;