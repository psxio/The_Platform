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
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  usedBy: varchar("used_by").references(() => users.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
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
