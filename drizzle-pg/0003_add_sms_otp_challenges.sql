CREATE TABLE IF NOT EXISTS "sms_otp_challenges" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "phone" text NOT NULL,
  "otp_id" text NOT NULL,
  "reference_code" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "requested_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "expires_at" text NOT NULL,
  "verified_at" text,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "sms_otp_challenges_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_sms_otp_challenges_user_status" ON "sms_otp_challenges" USING btree ("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_sms_otp_challenges_expires_at" ON "sms_otp_challenges" USING btree ("expires_at");
