import { z } from "zod";
import { sql } from "drizzle-orm";
import { pgTable, text, serial, timestamp, jsonb, integer, varchar, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Session storage table for auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles - determines which side of the app users see
export const userRoles = ["web3", "content", "admin"] as const;
export type UserRole = typeof userRoles[number];

// User storage table for internal auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 50 }).$type<UserRole>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  profileImageUrl: true,
  role: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const addressSchema = z.object({
  address: z.string(),
  username: z.string().optional(),
  points: z.number().optional(),
  rank: z.number().optional(),
});

export const validationErrorSchema = z.object({
  address: z.string(),
  error: z.string(),
  line: z.number().optional(),
});

export const comparisonResultSchema = z.object({
  notMinted: z.array(addressSchema),
  stats: z.object({
    totalEligible: z.number(),
    totalMinted: z.number(),
    remaining: z.number(),
    invalidAddresses: z.number().optional(),
  }),
  validationErrors: z.array(validationErrorSchema).optional(),
});

export type Address = z.infer<typeof addressSchema>;
export type ValidationError = z.infer<typeof validationErrorSchema>;
export type ComparisonResult = z.infer<typeof comparisonResultSchema>;

// Database schema for NFT collections
export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  createdAt: true,
});

export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;

// Database schema for minted addresses per collection
export const mintedAddresses = pgTable("minted_addresses", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  address: text("address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMintedAddressSchema = createInsertSchema(mintedAddresses).omit({
  id: true,
  createdAt: true,
});

export type MintedAddress = typeof mintedAddresses.$inferSelect;
export type InsertMintedAddress = z.infer<typeof insertMintedAddressSchema>;

// Database schema for comparison history
export const comparisons = pgTable("comparisons", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  collectionId: integer("collection_id").references(() => collections.id),
  mintedFileName: text("minted_file_name").notNull(),
  eligibleFileName: text("eligible_file_name").notNull(),
  totalEligible: integer("total_eligible").notNull(),
  totalMinted: integer("total_minted").notNull(),
  remaining: integer("remaining").notNull(),
  invalidAddresses: integer("invalid_addresses"),
  results: jsonb("results").notNull(),
});

export const insertComparisonSchema = createInsertSchema(comparisons).omit({
  id: true,
  createdAt: true,
});

export type Comparison = typeof comparisons.$inferSelect;
export type InsertComparison = z.infer<typeof insertComparisonSchema>;

// Database schema for personal tasks (to-do items) - Web3 side
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  projectTag: text("project_tag"),
  dueDate: text("due_date"),
  status: text("status").notNull().default("pending"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// ContentFlowStudio tables below

// Task statuses for multi-stage workflow
export const taskStatuses = ["TO BE STARTED", "IN PROGRESS", "IN REVIEW", "APPROVED", "COMPLETED"] as const;
export type TaskStatus = typeof taskStatuses[number];

// Campaigns table - for grouping related tasks
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  client: varchar("client", { length: 255 }),
  startDate: varchar("start_date", { length: 50 }),
  endDate: varchar("end_date", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  color: varchar("color", { length: 20 }).default("#3B82F6"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// Content Tasks table - for content production team
export const contentTasks = pgTable("content_tasks", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("TO BE STARTED"),
  assignedTo: varchar("assigned_to", { length: 255 }),
  dueDate: varchar("due_date", { length: 50 }),
  assignedBy: varchar("assigned_by", { length: 255 }),
  client: varchar("client", { length: 255 }),
  deliverable: text("deliverable"),
  notes: text("notes"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContentTaskSchema = createInsertSchema(contentTasks).omit({
  id: true,
  createdAt: true,
}).extend({
  assignedTo: z.string().optional().transform(val => val && val.trim() !== "" ? val : undefined),
  dueDate: z.string().optional().transform(val => val && val.trim() !== "" ? val : undefined),
  assignedBy: z.string().optional().transform(val => val && val.trim() !== "" ? val : undefined),
  client: z.string().optional().transform(val => val && val.trim() !== "" ? val : undefined),
  deliverable: z.string().optional().transform(val => val && val.trim() !== "" ? val : undefined),
  notes: z.string().optional().transform(val => val && val.trim() !== "" ? val : undefined),
  priority: z.string().optional().default("medium"),
  campaignId: z.number().optional().nullable(),
});

export type InsertContentTask = z.infer<typeof insertContentTaskSchema>;
export type ContentTask = typeof contentTasks.$inferSelect;

// Subtasks table - checklist items within a content task
export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => contentTasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubtaskSchema = createInsertSchema(subtasks).omit({
  id: true,
  createdAt: true,
});

export type InsertSubtask = z.infer<typeof insertSubtaskSchema>;
export type Subtask = typeof subtasks.$inferSelect;

// Comments table - for task discussions
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => contentTasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Activity log table - for tracking task changes
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => contentTasks.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

// Notifications table - for in-app notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  taskId: integer("task_id").references(() => contentTasks.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Directory members table - content team members
export const directoryMembers = pgTable("directory_members", {
  id: serial("id").primaryKey(),
  person: varchar("person", { length: 255 }).notNull(),
  skill: text("skill"),
  evmAddress: varchar("evm_address", { length: 255 }),
  client: varchar("client", { length: 255 }),
  email: varchar("email", { length: 255 }), // For email notifications
});

export const insertDirectoryMemberSchema = createInsertSchema(directoryMembers).omit({
  id: true,
});

export type InsertDirectoryMember = z.infer<typeof insertDirectoryMemberSchema>;
export type DirectoryMember = typeof directoryMembers.$inferSelect;

// Deliverables table - file uploads for content tasks
export const deliverables = pgTable("deliverables", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => contentTasks.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: varchar("file_size", { length: 50 }),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const insertDeliverableSchema = createInsertSchema(deliverables).omit({
  id: true,
  uploadedAt: true,
});

export type InsertDeliverable = z.infer<typeof insertDeliverableSchema>;
export type Deliverable = typeof deliverables.$inferSelect;

// Invite codes table - for secure role assignment (all roles require codes)
export const adminInviteCodes = pgTable("admin_invite_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  forRole: varchar("for_role", { length: 20 }).notNull().default("admin"), // Role this code grants: web3, content, or admin
  maxUses: integer("max_uses").default(1), // null = unlimited, otherwise max number of uses
  usedCount: integer("used_count").notNull().default(0), // how many times code has been used
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  usedBy: varchar("used_by").references(() => users.id, { onDelete: "set null" }), // last person who used it
  usedAt: timestamp("used_at"), // last time it was used
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // null = never expires
  isActive: boolean("is_active").notNull().default(true),
});

export const insertAdminInviteCodeSchema = createInsertSchema(adminInviteCodes).omit({
  id: true,
  createdAt: true,
  usedAt: true,
  usedBy: true,
});

export type InsertAdminInviteCode = z.infer<typeof insertAdminInviteCodeSchema>;
export type AdminInviteCode = typeof adminInviteCodes.$inferSelect;

// Invite code usage tracking - detailed record of each code use
export const adminInviteCodeUses = pgTable("admin_invite_code_uses", {
  id: serial("id").primaryKey(),
  codeId: integer("code_id").notNull().references(() => adminInviteCodes.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  userFirstName: varchar("user_first_name", { length: 255 }),
  userLastName: varchar("user_last_name", { length: 255 }),
  roleGranted: varchar("role_granted", { length: 20 }).notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export const insertAdminInviteCodeUseSchema = createInsertSchema(adminInviteCodeUses).omit({
  id: true,
  usedAt: true,
});

export type InsertAdminInviteCodeUse = z.infer<typeof insertAdminInviteCodeUseSchema>;
export type AdminInviteCodeUse = typeof adminInviteCodeUses.$inferSelect;

// ==================== ENHANCED CONTENTFLOWSTUDIO TABLES ====================

// Task Templates - reusable task structures
export const taskTemplates = pgTable("task_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  defaultPriority: varchar("default_priority", { length: 20 }).default("medium"),
  defaultClient: varchar("default_client", { length: 255 }),
  estimatedHours: integer("estimated_hours"),
  category: varchar("category", { length: 100 }),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type TaskTemplate = typeof taskTemplates.$inferSelect;

// Template Subtasks - subtask definitions within templates
export const templateSubtasks = pgTable("template_subtasks", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => taskTemplates.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),
});

export const insertTemplateSubtaskSchema = createInsertSchema(templateSubtasks).omit({
  id: true,
});

export type InsertTemplateSubtask = z.infer<typeof insertTemplateSubtaskSchema>;
export type TemplateSubtask = typeof templateSubtasks.$inferSelect;

// Task Watchers - users watching task updates
export const taskWatchers = pgTable("task_watchers", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => contentTasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskWatcherSchema = createInsertSchema(taskWatchers).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskWatcher = z.infer<typeof insertTaskWatcherSchema>;
export type TaskWatcher = typeof taskWatchers.$inferSelect;

// Approvals - for multi-stage approval workflow
export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => contentTasks.id, { onDelete: "cascade" }),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, approved, rejected
  comments: text("comments"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertApprovalSchema = createInsertSchema(approvals).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Approval = typeof approvals.$inferSelect;

// Time Entries - for time tracking per task
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => contentTasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hours: integer("hours").notNull().default(0),
  minutes: integer("minutes").notNull().default(0),
  description: text("description"),
  date: varchar("date", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;

// Assets - brand assets library
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: varchar("file_size", { length: 50 }),
  fileType: varchar("file_type", { length: 100 }),
  category: varchar("category", { length: 100 }),
  tags: text("tags"), // comma-separated tags
  description: text("description"),
  uploadedBy: varchar("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

// Deliverable Versions - track file versions
export const deliverableVersions = pgTable("deliverable_versions", {
  id: serial("id").primaryKey(),
  deliverableId: integer("deliverable_id").notNull().references(() => deliverables.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull().default(1),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: varchar("file_size", { length: 50 }),
  uploadedBy: varchar("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeliverableVersionSchema = createInsertSchema(deliverableVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertDeliverableVersion = z.infer<typeof insertDeliverableVersionSchema>;
export type DeliverableVersion = typeof deliverableVersions.$inferSelect;

// Saved Filters - user's saved filter presets
export const savedFilters = pgTable("saved_filters", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  filters: jsonb("filters").notNull(), // JSON of filter settings
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSavedFilterSchema = createInsertSchema(savedFilters).omit({
  id: true,
  createdAt: true,
});

export type InsertSavedFilter = z.infer<typeof insertSavedFilterSchema>;
export type SavedFilter = typeof savedFilters.$inferSelect;

// Recurring Tasks - configuration for auto-generated tasks
export const recurringTasks = pgTable("recurring_tasks", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => taskTemplates.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  frequency: varchar("frequency", { length: 50 }).notNull(), // daily, weekly, biweekly, monthly
  dayOfWeek: integer("day_of_week"), // 0-6 for weekly
  dayOfMonth: integer("day_of_month"), // 1-31 for monthly
  assignedTo: varchar("assigned_to", { length: 255 }),
  client: varchar("client", { length: 255 }),
  priority: varchar("priority", { length: 20 }).default("medium"),
  isActive: boolean("is_active").notNull().default(true),
  lastGeneratedAt: timestamp("last_generated_at"),
  nextGenerationAt: timestamp("next_generation_at"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRecurringTaskSchema = createInsertSchema(recurringTasks).omit({
  id: true,
  createdAt: true,
  lastGeneratedAt: true,
});

export type InsertRecurringTask = z.infer<typeof insertRecurringTaskSchema>;
export type RecurringTask = typeof recurringTasks.$inferSelect;

// Notification Preferences - user notification settings
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  emailAssignments: boolean("email_assignments").notNull().default(true),
  emailComments: boolean("email_comments").notNull().default(true),
  emailDueSoon: boolean("email_due_soon").notNull().default(true),
  emailOverdue: boolean("email_overdue").notNull().default(true),
  inAppAssignments: boolean("in_app_assignments").notNull().default(true),
  inAppComments: boolean("in_app_comments").notNull().default(true),
  inAppMentions: boolean("in_app_mentions").notNull().default(true),
  inAppDueSoon: boolean("in_app_due_soon").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  updatedAt: true,
});

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;

// Team Integration Settings - Telegram/Discord channel notifications
export const teamIntegrationSettings = pgTable("team_integration_settings", {
  id: serial("id").primaryKey(),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  telegramEnabled: boolean("telegram_enabled").notNull().default(false),
  discordWebhookUrl: text("discord_webhook_url"),
  discordEnabled: boolean("discord_enabled").notNull().default(false),
  notifyOnTaskCreate: boolean("notify_on_task_create").notNull().default(true),
  notifyOnTaskComplete: boolean("notify_on_task_complete").notNull().default(true),
  notifyOnTaskAssign: boolean("notify_on_task_assign").notNull().default(true),
  notifyOnComment: boolean("notify_on_comment").notNull().default(false),
  notifyOnDueSoon: boolean("notify_on_due_soon").notNull().default(true),
  notifyOnOverdue: boolean("notify_on_overdue").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const insertTeamIntegrationSettingsSchema = createInsertSchema(teamIntegrationSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertTeamIntegrationSettings = z.infer<typeof insertTeamIntegrationSettingsSchema>;
export type TeamIntegrationSettings = typeof teamIntegrationSettings.$inferSelect;

// User Invites - admin-generated invites for new team members
export const userInvites = pgTable("user_invites", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).$type<UserRole>().notNull().default("content"),
  token: varchar("token", { length: 255 }).notNull().unique(),
  invitedBy: varchar("invited_by").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserInviteSchema = createInsertSchema(userInvites).omit({
  id: true,
  token: true,
  createdAt: true,
  usedAt: true,
});

export type InsertUserInvite = z.infer<typeof insertUserInviteSchema>;
export type UserInvite = typeof userInvites.$inferSelect;

// Pending Content Members - users awaiting admin approval for content access
export const pendingContentMembers = pgTable("pending_content_members", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  inviteCodeId: integer("invite_code_id").references(() => adminInviteCodes.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  specialty: varchar("specialty", { length: 255 }),
  contactHandle: varchar("contact_handle", { length: 255 }), // Telegram, Discord, etc.
  portfolioUrl: varchar("portfolio_url", { length: 500 }),
  timezone: varchar("timezone", { length: 100 }),
  availability: varchar("availability", { length: 255 }),
  notes: text("notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPendingContentMemberSchema = createInsertSchema(pendingContentMembers).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export type InsertPendingContentMember = z.infer<typeof insertPendingContentMemberSchema>;
export type PendingContentMember = typeof pendingContentMembers.$inferSelect;

// Content Profile - extended profile for approved content team members
export const contentProfiles = pgTable("content_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  directoryMemberId: integer("directory_member_id").references(() => directoryMembers.id, { onDelete: "set null" }),
  specialty: varchar("specialty", { length: 255 }),
  contactHandle: varchar("contact_handle", { length: 255 }),
  contactType: varchar("contact_type", { length: 50 }), // telegram, discord, twitter, etc.
  portfolioUrl: varchar("portfolio_url", { length: 500 }),
  timezone: varchar("timezone", { length: 100 }),
  availability: varchar("availability", { length: 255 }),
  bio: text("bio"),
  isProfileComplete: boolean("is_profile_complete").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContentProfileSchema = createInsertSchema(contentProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContentProfile = z.infer<typeof insertContentProfileSchema>;
export type ContentProfile = typeof contentProfiles.$inferSelect;

// User Onboarding Status - track if user has completed onboarding
export const userOnboarding = pgTable("user_onboarding", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  hasSeenWelcome: boolean("has_seen_welcome").notNull().default(false),
  hasCreatedTask: boolean("has_created_task").notNull().default(false),
  hasAddedTeamMember: boolean("has_added_team_member").notNull().default(false),
  hasUploadedDeliverable: boolean("has_uploaded_deliverable").notNull().default(false),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserOnboardingSchema = createInsertSchema(userOnboarding).omit({
  id: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertUserOnboarding = z.infer<typeof insertUserOnboardingSchema>;
export type UserOnboarding = typeof userOnboarding.$inferSelect;

// ==================== WORKER MONITORING TABLES ====================

// Monitoring Consent - records user acknowledgment of monitoring terms
export const monitoringConsent = pgTable("monitoring_consent", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  consentGivenAt: timestamp("consent_given_at").defaultNow().notNull(),
  consentVersion: varchar("consent_version", { length: 20 }).notNull().default("1.0"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  acknowledgedScreenCapture: boolean("acknowledged_screen_capture").notNull().default(false),
  acknowledgedActivityLogging: boolean("acknowledged_activity_logging").notNull().default(false),
  acknowledgedHourlyReports: boolean("acknowledged_hourly_reports").notNull().default(false),
  acknowledgedDataStorage: boolean("acknowledged_data_storage").notNull().default(false),
});

export const insertMonitoringConsentSchema = createInsertSchema(monitoringConsent).omit({
  id: true,
  consentGivenAt: true,
});

export type InsertMonitoringConsent = z.infer<typeof insertMonitoringConsentSchema>;
export type MonitoringConsent = typeof monitoringConsent.$inferSelect;

// Monitoring Sessions - tracks active/completed monitoring periods
export const monitoringSessions = pgTable("monitoring_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, paused, ended
  totalDurationMinutes: integer("total_duration_minutes").default(0),
  screenshotCount: integer("screenshot_count").default(0),
  lastActivityAt: timestamp("last_activity_at"),
});

export const insertMonitoringSessionSchema = createInsertSchema(monitoringSessions).omit({
  id: true,
  startedAt: true,
});

export type InsertMonitoringSession = z.infer<typeof insertMonitoringSessionSchema>;
export type MonitoringSession = typeof monitoringSessions.$inferSelect;

// Monitoring Screenshots - stores captured screenshots
export const monitoringScreenshots = pgTable("monitoring_screenshots", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => monitoringSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  imageData: text("image_data").notNull(), // base64 encoded screenshot
  thumbnailData: text("thumbnail_data"), // smaller version for quick loading
  ocrText: text("ocr_text"), // extracted text from screenshot via Tesseract
  detectedApps: text("detected_apps"), // comma-separated list of detected applications
  activityLevel: varchar("activity_level", { length: 20 }).default("unknown"), // active, idle, unknown
  hourBucket: varchar("hour_bucket", { length: 20 }), // for grouping by hour (YYYY-MM-DD-HH)
});

export const insertMonitoringScreenshotSchema = createInsertSchema(monitoringScreenshots).omit({
  id: true,
  capturedAt: true,
});

export type InsertMonitoringScreenshot = z.infer<typeof insertMonitoringScreenshotSchema>;
export type MonitoringScreenshot = typeof monitoringScreenshots.$inferSelect;

// Monitoring Hourly Reports - summarized activity per hour
export const monitoringHourlyReports = pgTable("monitoring_hourly_reports", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => monitoringSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hourStart: timestamp("hour_start").notNull(),
  hourEnd: timestamp("hour_end").notNull(),
  randomScreenshotId: integer("random_screenshot_id").references(() => monitoringScreenshots.id, { onDelete: "set null" }),
  activitySummary: text("activity_summary"), // generated summary of detected activities
  topAppsDetected: text("top_apps_detected"), // most frequently detected apps
  activeMinutes: integer("active_minutes").default(0),
  idleMinutes: integer("idle_minutes").default(0),
  screenshotsTaken: integer("screenshots_taken").default(0),
  keywordsDetected: text("keywords_detected"), // notable keywords from OCR
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMonitoringHourlyReportSchema = createInsertSchema(monitoringHourlyReports).omit({
  id: true,
  createdAt: true,
});

export type InsertMonitoringHourlyReport = z.infer<typeof insertMonitoringHourlyReportSchema>;
export type MonitoringHourlyReport = typeof monitoringHourlyReports.$inferSelect;

// ==================== PAYMENT REQUEST TABLES ====================

// Payment request statuses
export const paymentRequestStatuses = ["pending", "approved", "rejected", "cancelled"] as const;
export type PaymentRequestStatus = typeof paymentRequestStatuses[number];

// Payment Requests - content team members can request payments for missed items
export const paymentRequests = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: text("amount").notNull(), // stored as text to support decimal formatting
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  reason: text("reason").notNull(),
  description: text("description"), // additional details
  status: varchar("status", { length: 20 }).$type<PaymentRequestStatus>().notNull().default("pending"),
  adminReviewerId: varchar("admin_reviewer_id").references(() => users.id, { onDelete: "set null" }),
  adminNote: text("admin_note"), // note from admin when approving/rejecting
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentRequestSchema = createInsertSchema(paymentRequests).omit({
  id: true,
  requestedAt: true,
  reviewedAt: true,
  updatedAt: true,
  status: true,
  adminReviewerId: true,
  adminNote: true,
});

export type InsertPaymentRequest = z.infer<typeof insertPaymentRequestSchema>;
export type PaymentRequest = typeof paymentRequests.$inferSelect;

// Payment Request Events - audit trail for status changes
export const paymentRequestEvents = pgTable("payment_request_events", {
  id: serial("id").primaryKey(),
  paymentRequestId: integer("payment_request_id").notNull().references(() => paymentRequests.id, { onDelete: "cascade" }),
  actorId: varchar("actor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 30 }).notNull(), // created, approved, rejected, cancelled, updated
  previousStatus: varchar("previous_status", { length: 20 }),
  newStatus: varchar("new_status", { length: 20 }),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentRequestEventSchema = createInsertSchema(paymentRequestEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertPaymentRequestEvent = z.infer<typeof insertPaymentRequestEventSchema>;
export type PaymentRequestEvent = typeof paymentRequestEvents.$inferSelect;

// ==================== BRAND PACKS TABLES ====================

// Brand pack file categories
export const brandPackFileCategories = ["logo", "font", "guideline", "color", "template", "other"] as const;
export type BrandPackFileCategory = typeof brandPackFileCategories[number];

// Client Brand Packs - client information with brand assets
export const clientBrandPacks = pgTable("client_brand_packs", {
  id: serial("id").primaryKey(),
  clientName: varchar("client_name", { length: 255 }).notNull().unique(),
  description: text("description"),
  website: varchar("website", { length: 500 }),
  primaryColor: varchar("primary_color", { length: 20 }),
  secondaryColor: varchar("secondary_color", { length: 20 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientBrandPackSchema = createInsertSchema(clientBrandPacks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientBrandPack = z.infer<typeof insertClientBrandPackSchema>;
export type ClientBrandPack = typeof clientBrandPacks.$inferSelect;

// Brand Pack Files - individual files within a brand pack
export const brandPackFiles = pgTable("brand_pack_files", {
  id: serial("id").primaryKey(),
  brandPackId: integer("brand_pack_id").notNull().references(() => clientBrandPacks.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: varchar("file_size", { length: 50 }),
  fileType: varchar("file_type", { length: 100 }),
  category: varchar("category", { length: 50 }).$type<BrandPackFileCategory>().default("other"),
  description: text("description"),
  uploadedBy: varchar("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBrandPackFileSchema = createInsertSchema(brandPackFiles).omit({
  id: true,
  createdAt: true,
});

export type InsertBrandPackFile = z.infer<typeof insertBrandPackFileSchema>;
export type BrandPackFile = typeof brandPackFiles.$inferSelect;

// ==================== GOOGLE SHEETS HUB TABLES ====================

// Sheet types supported by the hub
export const sheetTypes = ["payroll", "tasks", "directory", "data", "custom"] as const;
export type SheetType = typeof sheetTypes[number];

// Connected Google Sheets - track multiple sheets
export const connectedSheets = pgTable("connected_sheets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  sheetId: varchar("sheet_id", { length: 255 }).notNull(),
  sheetUrl: text("sheet_url"),
  sheetType: varchar("sheet_type", { length: 50 }).$type<SheetType>().notNull().default("custom"),
  tabName: varchar("tab_name", { length: 100 }), // specific tab within the spreadsheet
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: varchar("last_sync_status", { length: 50 }), // success, error, pending
  lastSyncMessage: text("last_sync_message"),
  syncDirection: varchar("sync_direction", { length: 20 }).default("both"), // push, pull, both
  cachedHeaders: text("cached_headers").array(), // Column headers for data type sheets
  cachedData: text("cached_data"), // JSON stringified data for data type sheets
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConnectedSheetSchema = createInsertSchema(connectedSheets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
  lastSyncStatus: true,
  lastSyncMessage: true,
});

export type InsertConnectedSheet = z.infer<typeof insertConnectedSheetSchema>;
export type ConnectedSheet = typeof connectedSheets.$inferSelect;

// Payroll Records - synced from payroll sheets
export const payrollRecords = pgTable("payroll_records", {
  id: serial("id").primaryKey(),
  connectedSheetId: integer("connected_sheet_id").references(() => connectedSheets.id, { onDelete: "cascade" }),
  entityName: varchar("entity_name", { length: 255 }).notNull(), // "Based" column
  walletAddress: varchar("wallet_address", { length: 255 }), // "0x" column
  inflowItem: text("inflow_item"),
  amountIn: varchar("amount_in", { length: 100 }),
  amountOut: varchar("amount_out", { length: 100 }),
  tokenType: varchar("token_type", { length: 100 }),
  tokenAddress: varchar("token_address", { length: 255 }),
  receiver: varchar("receiver", { length: 255 }),
  rawAmount: varchar("raw_amount", { length: 100 }),
  sheetRowId: varchar("sheet_row_id", { length: 100 }), // "id" column from sheet
  sheetRowIndex: integer("sheet_row_index"), // row number in sheet for updates
  syncedAt: timestamp("synced_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPayrollRecordSchema = createInsertSchema(payrollRecords).omit({
  id: true,
  createdAt: true,
  syncedAt: true,
});

export type InsertPayrollRecord = z.infer<typeof insertPayrollRecordSchema>;
export type PayrollRecord = typeof payrollRecords.$inferSelect;

// Sheet Sync Logs - track all sync operations
export const sheetSyncLogs = pgTable("sheet_sync_logs", {
  id: serial("id").primaryKey(),
  connectedSheetId: integer("connected_sheet_id").references(() => connectedSheets.id, { onDelete: "cascade" }),
  syncType: varchar("sync_type", { length: 20 }).notNull(), // push, pull
  status: varchar("status", { length: 20 }).notNull(), // success, error, partial
  recordsProcessed: integer("records_processed").default(0),
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  recordsDeleted: integer("records_deleted").default(0),
  errorMessage: text("error_message"),
  initiatedBy: varchar("initiated_by").references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertSheetSyncLogSchema = createInsertSchema(sheetSyncLogs).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export type InsertSheetSyncLog = z.infer<typeof insertSheetSyncLogSchema>;
export type SheetSyncLog = typeof sheetSyncLogs.$inferSelect;

// Multi-column Tasks - for project board style sheets
export const multiColumnTasks = pgTable("multi_column_tasks", {
  id: serial("id").primaryKey(),
  connectedSheetId: integer("connected_sheet_id").references(() => connectedSheets.id, { onDelete: "cascade" }),
  columnName: varchar("column_name", { length: 255 }).notNull(), // e.g., "4444 PORTAL", "BASE CHAPTERS"
  taskDescription: text("task_description").notNull(),
  rowIndex: integer("row_index"),
  status: varchar("status", { length: 50 }).default("pending"),
  syncedAt: timestamp("synced_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMultiColumnTaskSchema = createInsertSchema(multiColumnTasks).omit({
  id: true,
  createdAt: true,
  syncedAt: true,
});

export type InsertMultiColumnTask = z.infer<typeof insertMultiColumnTaskSchema>;
export type MultiColumnTask = typeof multiColumnTasks.$inferSelect;

// ==================== CLIENT CREDITS SYSTEM ====================

// Transaction types for credit history
export const creditTransactionTypes = ["credit_added", "credit_used", "credit_adjusted", "credit_refunded"] as const;
export type CreditTransactionType = typeof creditTransactionTypes[number];

// Client Credits - tracks available balance for each client/user
export const clientCredits = pgTable("client_credits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  balance: integer("balance").notNull().default(0), // Balance in cents (e.g., $250 = 25000)
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  notes: text("notes"), // Admin notes about this client's credits
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientCreditSchema = createInsertSchema(clientCredits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientCredit = z.infer<typeof insertClientCreditSchema>;
export type ClientCredit = typeof clientCredits.$inferSelect;

// Credit Transactions - history of all credit changes
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).$type<CreditTransactionType>().notNull(),
  amount: integer("amount").notNull(), // Amount in cents (positive for add, negative for deduct)
  balanceAfter: integer("balance_after").notNull(), // Balance after this transaction
  description: text("description"), // Description of the transaction
  taskId: integer("task_id").references(() => contentTasks.id, { onDelete: "set null" }), // If credit was used for a task
  performedBy: varchar("performed_by").references(() => users.id, { onDelete: "set null" }), // Admin who made the change
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;

// ==================== CLIENT CREDIT REQUESTS ====================

// Credit request statuses
export const creditRequestStatuses = ["pending", "approved", "rejected", "cancelled"] as const;
export type CreditRequestStatus = typeof creditRequestStatuses[number];

// Credit Requests - clients can request additional credits
export const creditRequests = pgTable("credit_requests", {
  id: serial("id").primaryKey(),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // Requested amount in cents
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  reason: text("reason").notNull(), // Why they need more credits
  description: text("description"), // Additional details
  status: varchar("status", { length: 20 }).$type<CreditRequestStatus>().notNull().default("pending"),
  adminReviewerId: varchar("admin_reviewer_id").references(() => users.id, { onDelete: "set null" }),
  adminNote: text("admin_note"), // Note from admin when approving/rejecting
  approvedAmount: integer("approved_amount"), // Admin may approve a different amount
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCreditRequestSchema = createInsertSchema(creditRequests).omit({
  id: true,
  requestedAt: true,
  reviewedAt: true,
  updatedAt: true,
  status: true,
  adminReviewerId: true,
  adminNote: true,
  approvedAmount: true,
});

export type InsertCreditRequest = z.infer<typeof insertCreditRequestSchema>;
export type CreditRequest = typeof creditRequests.$inferSelect;

// ==================== CONTENT ORDERS (SPENDING CREDITS) ====================

// Content order statuses
export const contentOrderStatuses = ["draft", "submitted", "in_progress", "review", "completed", "cancelled"] as const;
export type ContentOrderStatus = typeof contentOrderStatuses[number];

// Content order types
export const contentOrderTypes = ["article", "blog_post", "social_media", "video_script", "graphics", "other"] as const;
export type ContentOrderType = typeof contentOrderTypes[number];

// Content Orders - clients can spend credits to order content
export const contentOrders = pgTable("content_orders", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderType: varchar("order_type", { length: 50 }).$type<ContentOrderType>().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(), // Detailed requirements
  specifications: text("specifications"), // Technical specs, dimensions, etc.
  creditCost: integer("credit_cost").notNull(), // Cost in cents
  status: varchar("status", { length: 20 }).$type<ContentOrderStatus>().notNull().default("draft"),
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  dueDate: timestamp("due_date"),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }), // Content team member
  relatedTaskId: integer("related_task_id").references(() => contentTasks.id, { onDelete: "set null" }), // Linked task
  deliverableUrl: text("deliverable_url"), // Final deliverable
  clientNotes: text("client_notes"), // Notes from client
  teamNotes: text("team_notes"), // Notes from content team
  submittedAt: timestamp("submitted_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContentOrderSchema = createInsertSchema(contentOrders).omit({
  id: true,
  status: true,
  assignedTo: true,
  relatedTaskId: true,
  deliverableUrl: true,
  teamNotes: true,
  submittedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContentOrder = z.infer<typeof insertContentOrderSchema>;
export type ContentOrder = typeof contentOrders.$inferSelect;

// ==================== CLIENT ONBOARDING ====================

// Client Onboarding - track client-specific onboarding progress
export const clientOnboarding = pgTable("client_onboarding", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  hasSeenWelcome: boolean("has_seen_welcome").notNull().default(false),
  hasViewedCredits: boolean("has_viewed_credits").notNull().default(false),
  hasPlacedFirstOrder: boolean("has_placed_first_order").notNull().default(false),
  hasViewedBrandPacks: boolean("has_viewed_brand_packs").notNull().default(false),
  hasViewedTransactionHistory: boolean("has_viewed_transaction_history").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientOnboardingSchema = createInsertSchema(clientOnboarding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertClientOnboarding = z.infer<typeof insertClientOnboardingSchema>;
export type ClientOnboarding = typeof clientOnboarding.$inferSelect;

// ==================== WEB3 ONBOARDING ====================

// Web3 Onboarding - track web3-specific onboarding progress
export const web3Onboarding = pgTable("web3_onboarding", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  hasSeenWelcome: boolean("has_seen_welcome").notNull().default(false),
  hasComparedAddresses: boolean("has_compared_addresses").notNull().default(false),
  hasExtractedAddresses: boolean("has_extracted_addresses").notNull().default(false),
  hasCreatedCollection: boolean("has_created_collection").notNull().default(false),
  hasViewedHistory: boolean("has_viewed_history").notNull().default(false),
  hasUsedMerge: boolean("has_used_merge").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWeb3OnboardingSchema = createInsertSchema(web3Onboarding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertWeb3Onboarding = z.infer<typeof insertWeb3OnboardingSchema>;
export type Web3Onboarding = typeof web3Onboarding.$inferSelect;

// ==================== CLIENT WORK LIBRARY ====================

// Categories for client work items
export const clientWorkCategories = ["article", "blog_post", "social_media", "graphic", "video", "document", "presentation", "other"] as const;
export type ClientWorkCategory = typeof clientWorkCategories[number];

// Status for client work items
export const clientWorkStatuses = ["draft", "in_review", "approved", "published"] as const;
export type ClientWorkStatus = typeof clientWorkStatuses[number];

// Client Work Items - completed work organized by client
export const clientWorkItems = pgTable("client_work_items", {
  id: serial("id").primaryKey(),
  brandPackId: integer("brand_pack_id").notNull().references(() => clientBrandPacks.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).$type<ClientWorkCategory>().default("other"),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: varchar("file_size", { length: 50 }),
  fileType: varchar("file_type", { length: 100 }),
  status: varchar("status", { length: 20 }).$type<ClientWorkStatus>().default("draft"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => contentTasks.id, { onDelete: "set null" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientWorkItemSchema = createInsertSchema(clientWorkItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientWorkItem = z.infer<typeof insertClientWorkItemSchema>;
export type ClientWorkItem = typeof clientWorkItems.$inferSelect;
