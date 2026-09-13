ALTER TABLE "auth_users" ADD COLUMN IF NOT EXISTS "admin_role" text DEFAULT 'owner' NOT NULL;
ALTER TABLE "auth_users" ADD COLUMN IF NOT EXISTS "permissions" text DEFAULT '' NOT NULL;
