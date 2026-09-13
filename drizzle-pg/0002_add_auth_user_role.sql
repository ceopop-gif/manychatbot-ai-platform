ALTER TABLE "auth_users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'merchant' NOT NULL;
