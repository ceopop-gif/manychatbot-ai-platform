import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    name: text("name").notNull(),
    systemCode: text("system_code").notNull(),
    customerName: text("customer_name").notNull().default(""),
    customerEmail: text("customer_email").notNull().default(""),
    customerPhone: text("customer_phone").notNull().default(""),
    plan: text("plan").notNull().default("trial"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_workspaces_owner_user_id").on(table.ownerUserId),
    uniqueIndex("idx_workspaces_owner_code").on(table.ownerUserId, table.systemCode),
  ]
);

export const chatbots = sqliteTable(
  "chatbots",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    businessSystem: text("business_system").notNull().default(""),
    description: text("description").notNull().default(""),
    greeting: text("greeting").notNull().default(""),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_chatbots_owner_user_id").on(table.ownerUserId),
    index("idx_chatbots_workspace_id").on(table.workspaceId),
  ]
);

export const adminProfiles = sqliteTable(
  "admin_profiles",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    gender: text("gender").notNull().default("unspecified"),
    age: integer("age").notNull().default(28),
    avatarId: text("avatar_id").notNull().default("avatar-01"),
    role: text("role").notNull().default("AI Admin"),
    department: text("department").notNull().default("บริการลูกค้า"),
    description: text("description").notNull().default(""),
    personality: text("personality").notNull().default(""),
    customerTypingStyle: text("customer_typing_style").notNull().default(""),
    color: text("color").notNull().default("cyan"),
    status: text("status").notNull().default("active"),
    isFallback: integer("is_fallback", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_admin_profiles_owner_workspace").on(table.ownerUserId, table.workspaceId),
    index("idx_admin_profiles_status").on(table.status),
  ]
);

export const adminSkills = sqliteTable(
  "admin_skills",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    adminId: text("admin_id").notNull().references(() => adminProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    objective: text("objective").notNull().default(""),
    instructions: text("instructions").notNull().default(""),
    knowledge: text("knowledge").notNull().default(""),
    routingKeywords: text("routing_keywords").notNull().default(""),
    minimumConfidence: integer("minimum_confidence").notNull().default(70),
    tone: text("tone").notNull().default("สุภาพ กระชับ เป็นมืออาชีพ"),
    escalationRules: text("escalation_rules").notNull().default(""),
    prohibitedTopics: text("prohibited_topics").notNull().default(""),
    compiledMarkdown: text("compiled_markdown").notNull().default(""),
    status: text("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_admin_skills_admin_status").on(table.adminId, table.status),
    index("idx_admin_skills_owner_workspace").on(table.ownerUserId, table.workspaceId),
  ]
);

export const adminDocuments = sqliteTable(
  "admin_documents",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    adminId: text("admin_id").notNull().references(() => adminProfiles.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull().default("markdown"),
    mimeType: text("mime_type").notNull().default("text/markdown"),
    storageKey: text("storage_key"),
    content: text("content").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    pageCount: integer("page_count").notNull().default(0),
    isTruncated: integer("is_truncated", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_admin_documents_admin_updated").on(table.adminId, table.updatedAt),
    index("idx_admin_documents_owner_workspace").on(table.ownerUserId, table.workspaceId),
  ]
);

export const aiProviders = sqliteTable(
  "ai_providers",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    name: text("name").notNull(),
    model: text("model").notNull(),
    baseUrl: text("base_url").notNull().default(""),
    apiKeyEncrypted: text("api_key_encrypted").notNull().default(""),
    status: text("status").notNull().default("pending"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    temperature: integer("temperature").notNull().default(30),
    maxOutputTokens: integer("max_output_tokens").notNull().default(700),
    lastTestedAt: text("last_tested_at"),
    lastError: text("last_error").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_ai_providers_owner_workspace").on(table.ownerUserId, table.workspaceId),
    index("idx_ai_providers_workspace_default").on(table.workspaceId, table.isDefault),
  ]
);

export const channelAccounts = sqliteTable(
  "channel_accounts",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    chatbotId: text("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    accountName: text("account_name").notNull(),
    externalId: text("external_id").notNull().default(""),
    channelId: text("channel_id").notNull().default(""),
    channelSecretEncrypted: text("channel_secret_encrypted").notNull().default(""),
    accessTokenEncrypted: text("access_token_encrypted").notNull().default(""),
    webhookKey: text("webhook_key").notNull().default(""),
    adminId: text("admin_id").references(() => adminProfiles.id, { onDelete: "set null" }),
    aiProviderId: text("ai_provider_id").references(() => aiProviders.id, { onDelete: "set null" }),
    autoReply: integer("auto_reply", { mode: "boolean" }).notNull().default(true),
    status: text("status").notNull().default("pending"),
    unreadCount: integer("unread_count").notNull().default(0),
    connectedAt: text("connected_at"),
    lastWebhookAt: text("last_webhook_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_channel_accounts_chatbot_id").on(table.chatbotId),
    index("idx_channel_accounts_owner_user_id").on(table.ownerUserId),
    index("idx_channel_accounts_platform").on(table.platform),
    index("idx_channel_accounts_webhook_key").on(table.webhookKey),
    index("idx_channel_accounts_workspace_platform").on(table.workspaceId, table.platform),
  ]
);

export const paymentProfiles = sqliteTable(
  "payment_profiles",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("chatpos"),
    merchantId: text("merchant_id").notNull().default(""),
    checkoutBaseUrl: text("checkout_base_url").notNull().default("https://chatpospay.com"),
    webhookSecretEncrypted: text("webhook_secret_encrypted").notNull().default(""),
    mode: text("mode").notNull().default("test"),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_payment_profiles_workspace").on(table.workspaceId),
    index("idx_payment_profiles_owner").on(table.ownerUserId),
  ]
);

export const paymentOrders = sqliteTable(
  "payment_orders",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(),
    customerName: text("customer_name").notNull().default(""),
    customerPhone: text("customer_phone").notNull().default(""),
    description: text("description").notNull().default(""),
    amountSatang: integer("amount_satang").notNull(),
    currency: text("currency").notNull().default("THB"),
    status: text("status").notNull().default("pending"),
    checkoutUrl: text("checkout_url").notNull().default(""),
    transactionId: text("transaction_id").notNull().default(""),
    expiresAt: text("expires_at"),
    paidAt: text("paid_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_payment_orders_reference").on(table.reference),
    index("idx_payment_orders_owner_workspace_created").on(table.ownerUserId, table.workspaceId, table.createdAt),
    index("idx_payment_orders_workspace_status").on(table.workspaceId, table.status),
  ]
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    chatbotId: text("chatbot_id").notNull().references(() => chatbots.id, { onDelete: "cascade" }),
    channelAccountId: text("channel_account_id").notNull().references(() => channelAccounts.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    externalUserId: text("external_user_id").notNull(),
    customerName: text("customer_name").notNull().default("ลูกค้า"),
    status: text("status").notNull().default("open"),
    assignedAdminId: text("assigned_admin_id").references(() => adminProfiles.id, { onDelete: "set null" }),
    skillId: text("skill_id").references(() => adminSkills.id, { onDelete: "set null" }),
    aiEnabled: integer("ai_enabled", { mode: "boolean" }).notNull().default(true),
    unreadCount: integer("unread_count").notNull().default(0),
    sentiment: text("sentiment").notNull().default("neutral"),
    lastCustomerMessage: text("last_customer_message").notNull().default(""),
    lastMessagePreview: text("last_message_preview").notNull().default(""),
    routingConfidence: integer("routing_confidence").notNull().default(0),
    routingReason: text("routing_reason").notNull().default(""),
    humanTakeover: integer("human_takeover", { mode: "boolean" }).notNull().default(false),
    humanAgentName: text("human_agent_name").notNull().default(""),
    routedAt: text("routed_at"),
    lastMessageAt: text("last_message_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_conversations_channel_customer").on(table.channelAccountId, table.externalUserId),
    index("idx_conversations_owner_workspace_last").on(table.ownerUserId, table.workspaceId, table.lastMessageAt),
    index("idx_conversations_status_assignee").on(table.status, table.assignedAdminId),
  ]
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    direction: text("direction").notNull(),
    senderType: text("sender_type").notNull(),
    senderName: text("sender_name").notNull().default(""),
    content: text("content").notNull(),
    externalMessageId: text("external_message_id").notNull().default(""),
    deliveryStatus: text("delivery_status").notNull().default("received"),
    aiProviderId: text("ai_provider_id").references(() => aiProviders.id, { onDelete: "set null" }),
    adminId: text("admin_id").references(() => adminProfiles.id, { onDelete: "set null" }),
    skillId: text("skill_id").references(() => adminSkills.id, { onDelete: "set null" }),
    model: text("model").notNull().default(""),
    latencyMs: integer("latency_ms").notNull().default(0),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    confidence: integer("confidence").notNull().default(0),
    routingReason: text("routing_reason").notNull().default(""),
    skillVersion: integer("skill_version").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_messages_conversation_created").on(table.conversationId, table.createdAt),
    index("idx_messages_owner_created").on(table.ownerUserId, table.createdAt),
    uniqueIndex("idx_messages_owner_external_event")
      .on(table.ownerUserId, table.externalMessageId)
      .where(sql`${table.externalMessageId} <> ''`),
  ]
);
