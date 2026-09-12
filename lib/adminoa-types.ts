export type WorkspaceRecord = {
  id: string;
  name: string;
  systemCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  plan: string;
  status: string;
  botCount: number;
  channelCount: number;
  unreadCount: number;
  createdAt: string;
};

export type ChatbotRecord = {
  id: string;
  workspaceId: string | null;
  name: string;
  businessSystem: string;
  description: string;
  greeting: string;
  status: string;
  channelCount: number;
  unreadCount: number;
  createdAt: string;
};

export type ChannelAccountRecord = {
  id: string;
  workspaceId: string | null;
  chatbotId: string;
  platform: "line" | "telegram" | "facebook";
  accountName: string;
  externalId: string;
  channelId: string;
  status: string;
  webhookKey: string;
  webhookUrl: string;
  adminId: string | null;
  aiProviderId: string | null;
  autoReply: boolean;
  hasChannelSecret: boolean;
  hasAccessToken: boolean;
  unreadCount: number;
  connectedAt: string | null;
  lastWebhookAt: string | null;
  createdAt: string;
};

export type AdminRecord = {
  id: string;
  workspaceId: string;
  name: string;
  gender: "female" | "male" | "nonbinary" | "unspecified";
  age: number;
  avatarId: string;
  role: string;
  department: string;
  description: string;
  personality: string;
  customerTypingStyle: string;
  color: string;
  status: string;
  isFallback: boolean;
  activeSkillCount: number;
  documentCount: number;
  skills: Array<{ id: string; name: string; status: string; version: number }>;
  createdAt: string;
};

export type AdminDocumentRecord = {
  id: string;
  workspaceId: string;
  adminId: string;
  fileName: string;
  fileType: "markdown" | "pdf";
  mimeType: string;
  content: string;
  sizeBytes: number;
  pageCount: number;
  isTruncated: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SkillRecord = {
  id: string;
  workspaceId: string;
  adminId: string;
  adminName: string;
  name: string;
  objective: string;
  instructions: string;
  knowledge: string;
  routingKeywords: string;
  minimumConfidence: number;
  tone: string;
  escalationRules: string;
  prohibitedTopics: string;
  hasCompiledMarkdown: boolean;
  status: string;
  version: number;
  updatedAt: string;
};

export type ProviderRecord = {
  id: string;
  workspaceId: string;
  provider: "openai" | "anthropic" | "gemini" | "custom";
  name: string;
  model: string;
  baseUrl: string;
  status: string;
  isDefault: boolean;
  hasApiKey: boolean;
  lastTestedAt: string | null;
  lastError: string;
  temperature: number;
  maxOutputTokens: number;
  createdAt: string;
};

export type ConversationRecord = {
  id: string;
  workspaceId: string;
  channelAccountId: string;
  platform: string;
  externalUserId: string;
  customerName: string;
  status: "open" | "pending" | "escalated" | "closed";
  assignedAdminId: string | null;
  adminName: string;
  adminAvatarId: string;
  skillId: string | null;
  skillName: string;
  aiEnabled: boolean;
  unreadCount: number;
  sentiment: string;
  lastCustomerMessage: string;
  lastMessagePreview: string;
  routingConfidence: number;
  routingReason: string;
  humanTakeover: boolean;
  humanAgentName: string;
  routedAt: string | null;
  lastMessageAt: string;
  channelName: string;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  senderType: "customer" | "ai" | "admin" | "system";
  senderName: string;
  content: string;
  deliveryStatus: string;
  adminId: string | null;
  skillId: string | null;
  model: string;
  latencyMs: number;
  confidence: number;
  routingReason: string;
  skillVersion: number;
  createdAt: string;
};

export type ReportRecord = {
  summary: {
    inboundToday: number;
    aiToday: number;
    adminToday: number;
    openConversations: number;
    pendingConversations: number;
    humanHandoffConversations: number;
    aiResolutionRate: number;
    averageAiLatencyMs: number;
  };
  days: Array<{ date: string; label: string; inbound: number; ai: number }>;
};

export type PaymentProfileRecord = {
  id: string;
  workspaceId: string;
  provider: "chatpos";
  merchantId: string;
  checkoutBaseUrl: string;
  mode: "test" | "live";
  status: string;
  hasWebhookSecret: boolean;
  updatedAt: string;
};

export type PaymentOrderRecord = {
  id: string;
  workspaceId: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  description: string;
  amountSatang: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "expired" | "refunded";
  checkoutUrl: string;
  transactionId: string;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type PaymentData = {
  profile: PaymentProfileRecord | null;
  orders: PaymentOrderRecord[];
  summary: {
    pendingCount: number;
    paidCount: number;
    paidAmountSatang: number;
  };
  webhookUrl: string;
};
