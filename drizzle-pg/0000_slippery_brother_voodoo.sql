CREATE TABLE "admin_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"admin_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text DEFAULT 'markdown' NOT NULL,
	"mime_type" text DEFAULT 'text/markdown' NOT NULL,
	"storage_key" text,
	"content" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"page_count" integer DEFAULT 0 NOT NULL,
	"is_truncated" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"gender" text DEFAULT 'unspecified' NOT NULL,
	"age" integer DEFAULT 28 NOT NULL,
	"avatar_id" text DEFAULT 'avatar-01' NOT NULL,
	"role" text DEFAULT 'AI Admin' NOT NULL,
	"department" text DEFAULT 'บริการลูกค้า' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"personality" text DEFAULT '' NOT NULL,
	"customer_typing_style" text DEFAULT '' NOT NULL,
	"color" text DEFAULT 'cyan' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"admin_id" text NOT NULL,
	"name" text NOT NULL,
	"objective" text DEFAULT '' NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"knowledge" text DEFAULT '' NOT NULL,
	"routing_keywords" text DEFAULT '' NOT NULL,
	"minimum_confidence" integer DEFAULT 70 NOT NULL,
	"tone" text DEFAULT 'สุภาพ กระชับ เป็นมืออาชีพ' NOT NULL,
	"escalation_rules" text DEFAULT '' NOT NULL,
	"prohibited_topics" text DEFAULT '' NOT NULL,
	"compiled_markdown" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"model" text NOT NULL,
	"base_url" text DEFAULT '' NOT NULL,
	"api_key_encrypted" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"temperature" integer DEFAULT 30 NOT NULL,
	"max_output_tokens" integer DEFAULT 700 NOT NULL,
	"last_tested_at" text,
	"last_error" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"workspace_id" text,
	"chatbot_id" text NOT NULL,
	"platform" text NOT NULL,
	"account_name" text NOT NULL,
	"external_id" text DEFAULT '' NOT NULL,
	"channel_id" text DEFAULT '' NOT NULL,
	"channel_secret_encrypted" text DEFAULT '' NOT NULL,
	"access_token_encrypted" text DEFAULT '' NOT NULL,
	"webhook_key" text DEFAULT '' NOT NULL,
	"admin_id" text,
	"ai_provider_id" text,
	"auto_reply" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"connected_at" text,
	"last_webhook_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbots" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"workspace_id" text,
	"name" text NOT NULL,
	"business_system" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"greeting" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"chatbot_id" text NOT NULL,
	"channel_account_id" text NOT NULL,
	"platform" text NOT NULL,
	"external_user_id" text NOT NULL,
	"customer_name" text DEFAULT 'ลูกค้า' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_admin_id" text,
	"skill_id" text,
	"ai_enabled" boolean DEFAULT true NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"sentiment" text DEFAULT 'neutral' NOT NULL,
	"last_customer_message" text DEFAULT '' NOT NULL,
	"last_message_preview" text DEFAULT '' NOT NULL,
	"routing_confidence" integer DEFAULT 0 NOT NULL,
	"routing_reason" text DEFAULT '' NOT NULL,
	"human_takeover" boolean DEFAULT false NOT NULL,
	"human_agent_name" text DEFAULT '' NOT NULL,
	"routed_at" text,
	"last_message_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"direction" text NOT NULL,
	"sender_type" text NOT NULL,
	"sender_name" text DEFAULT '' NOT NULL,
	"content" text NOT NULL,
	"external_message_id" text DEFAULT '' NOT NULL,
	"delivery_status" text DEFAULT 'received' NOT NULL,
	"ai_provider_id" text,
	"admin_id" text,
	"skill_id" text,
	"model" text DEFAULT '' NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"routing_reason" text DEFAULT '' NOT NULL,
	"skill_version" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"reference" text NOT NULL,
	"customer_name" text DEFAULT '' NOT NULL,
	"customer_phone" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"amount_satang" integer NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"checkout_url" text DEFAULT '' NOT NULL,
	"transaction_id" text DEFAULT '' NOT NULL,
	"expires_at" text,
	"paid_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text DEFAULT 'chatpos' NOT NULL,
	"merchant_id" text DEFAULT '' NOT NULL,
	"checkout_base_url" text DEFAULT 'https://chatpospay.com' NOT NULL,
	"webhook_secret_encrypted" text DEFAULT '' NOT NULL,
	"mode" text DEFAULT 'test' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"system_code" text NOT NULL,
	"customer_name" text DEFAULT '' NOT NULL,
	"customer_email" text DEFAULT '' NOT NULL,
	"customer_phone" text DEFAULT '' NOT NULL,
	"plan" text DEFAULT 'trial' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_documents" ADD CONSTRAINT "admin_documents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_documents" ADD CONSTRAINT "admin_documents_admin_id_admin_profiles_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_skills" ADD CONSTRAINT "admin_skills_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_skills" ADD CONSTRAINT "admin_skills_admin_id_admin_profiles_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_accounts" ADD CONSTRAINT "channel_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_accounts" ADD CONSTRAINT "channel_accounts_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_accounts" ADD CONSTRAINT "channel_accounts_admin_id_admin_profiles_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_accounts" ADD CONSTRAINT "channel_accounts_ai_provider_id_ai_providers_id_fk" FOREIGN KEY ("ai_provider_id") REFERENCES "public"."ai_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_chatbot_id_chatbots_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_channel_account_id_channel_accounts_id_fk" FOREIGN KEY ("channel_account_id") REFERENCES "public"."channel_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_admin_id_admin_profiles_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_skill_id_admin_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."admin_skills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_ai_provider_id_ai_providers_id_fk" FOREIGN KEY ("ai_provider_id") REFERENCES "public"."ai_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_admin_id_admin_profiles_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_skill_id_admin_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."admin_skills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_profiles" ADD CONSTRAINT "payment_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_documents_admin_updated" ON "admin_documents" USING btree ("admin_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_admin_documents_owner_workspace" ON "admin_documents" USING btree ("owner_user_id","workspace_id");--> statement-breakpoint
CREATE INDEX "idx_admin_profiles_owner_workspace" ON "admin_profiles" USING btree ("owner_user_id","workspace_id");--> statement-breakpoint
CREATE INDEX "idx_admin_profiles_status" ON "admin_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_admin_skills_admin_status" ON "admin_skills" USING btree ("admin_id","status");--> statement-breakpoint
CREATE INDEX "idx_admin_skills_owner_workspace" ON "admin_skills" USING btree ("owner_user_id","workspace_id");--> statement-breakpoint
CREATE INDEX "idx_ai_providers_owner_workspace" ON "ai_providers" USING btree ("owner_user_id","workspace_id");--> statement-breakpoint
CREATE INDEX "idx_ai_providers_workspace_default" ON "ai_providers" USING btree ("workspace_id","is_default");--> statement-breakpoint
CREATE INDEX "idx_channel_accounts_chatbot_id" ON "channel_accounts" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "idx_channel_accounts_owner_user_id" ON "channel_accounts" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "idx_channel_accounts_platform" ON "channel_accounts" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "idx_channel_accounts_webhook_key" ON "channel_accounts" USING btree ("webhook_key");--> statement-breakpoint
CREATE INDEX "idx_channel_accounts_workspace_platform" ON "channel_accounts" USING btree ("workspace_id","platform");--> statement-breakpoint
CREATE INDEX "idx_chatbots_owner_user_id" ON "chatbots" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "idx_chatbots_workspace_id" ON "chatbots" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_conversations_channel_customer" ON "conversations" USING btree ("channel_account_id","external_user_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_owner_workspace_last" ON "conversations" USING btree ("owner_user_id","workspace_id","last_message_at");--> statement-breakpoint
CREATE INDEX "idx_conversations_status_assignee" ON "conversations" USING btree ("status","assigned_admin_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation_created" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_owner_created" ON "messages" USING btree ("owner_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_messages_owner_external_event" ON "messages" USING btree ("owner_user_id","external_message_id") WHERE "messages"."external_message_id" <> '';--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payment_orders_reference" ON "payment_orders" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "idx_payment_orders_owner_workspace_created" ON "payment_orders" USING btree ("owner_user_id","workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_payment_orders_workspace_status" ON "payment_orders" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payment_profiles_workspace" ON "payment_profiles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_payment_profiles_owner" ON "payment_profiles" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "idx_workspaces_owner_user_id" ON "workspaces" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_workspaces_owner_code" ON "workspaces" USING btree ("owner_user_id","system_code");