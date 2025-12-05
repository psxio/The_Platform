import { z } from "zod";
import { sql } from "drizzle-orm";
import { pgTable, text, serial, timestamp, jsonb, integer, varchar, index, boolean, real } from "drizzle-orm/pg-core";
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

// Internal projects for internal content work
export const internalProjects = ["4444 Collection", "PSX", "Create", "Platform", "General"] as const;
export type InternalProject = typeof internalProjects[number];

// Content Tasks table - for content production team
export const contentTasks = pgTable("content_tasks", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("TO BE STARTED"),
  assignedTo: varchar("assigned_to", { length: 255 }),
  dueDate: varchar("due_date", { length: 50 }),
  assignedBy: varchar("assigned_by", { length: 255 }),
  client: varchar("client", { length: 255 }),
  clientType: varchar("client_type", { length: 20 }).default("external"), // "internal" or "external"
  internalProject: varchar("internal_project", { length: 100 }), // For internal projects like 4444 Collection, PSX, etc.
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
  clientType: z.enum(["internal", "external"]).optional().default("external"),
  internalProject: z.string().optional().transform(val => val && val.trim() !== "" ? val : undefined),
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

// Task Watchers - users watching task updates (supports both personal and content tasks)
export const taskWatchers = pgTable("task_watchers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskType: varchar("task_type", { length: 20 }).notNull().default("content"), // "personal" or "content"
  taskId: integer("task_id").notNull(), // References tasks.id or contentTasks.id based on taskType
  notifyOnStatusChange: boolean("notify_on_status_change").default(true),
  notifyOnComment: boolean("notify_on_comment").default(true),
  notifyOnAssignment: boolean("notify_on_assignment").default(true),
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
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, approved, rejected, skipped
  comments: text("comments"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  stage: integer("stage").notNull().default(1), // Stage order in multi-stage workflow
  stageName: varchar("stage_name", { length: 100 }), // e.g., "Internal Review", "Client Review", "Final Approval"
  isRequired: boolean("is_required").notNull().default(true), // Whether this approval is required to proceed
  dueDate: timestamp("due_date"), // Optional deadline for this approval stage
});

export const insertApprovalSchema = createInsertSchema(approvals).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Approval = typeof approvals.$inferSelect;

// Approval Workflow Templates - predefined workflows for different content types
export const approvalWorkflows = pgTable("approval_workflows", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  contentType: varchar("content_type", { length: 100 }), // article, blog_post, social_media, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApprovalWorkflowSchema = createInsertSchema(approvalWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertApprovalWorkflow = z.infer<typeof insertApprovalWorkflowSchema>;
export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;

// Approval Workflow Stages - stages within a workflow template
export const approvalWorkflowStages = pgTable("approval_workflow_stages", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull().references(() => approvalWorkflows.id, { onDelete: "cascade" }),
  stageName: varchar("stage_name", { length: 100 }).notNull(),
  stageOrder: integer("stage_order").notNull().default(1),
  reviewerRole: varchar("reviewer_role", { length: 50 }), // admin, content, or specific user type
  reviewerId: varchar("reviewer_id").references(() => users.id, { onDelete: "set null" }), // Optional specific reviewer
  isRequired: boolean("is_required").notNull().default(true),
  daysToComplete: integer("days_to_complete"), // SLA for this stage
});

export const insertApprovalWorkflowStageSchema = createInsertSchema(approvalWorkflowStages).omit({
  id: true,
});

export type InsertApprovalWorkflowStage = z.infer<typeof insertApprovalWorkflowStageSchema>;
export type ApprovalWorkflowStage = typeof approvalWorkflowStages.$inferSelect;

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

// Work Sessions - clock in/out tracking
export const workSessions = pgTable("work_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clockInTime: timestamp("clock_in_time").notNull().defaultNow(),
  clockOutTime: timestamp("clock_out_time"),
  summary: text("summary"),
  taskIds: text("task_ids"), // JSON array of task IDs worked on
  totalMinutes: integer("total_minutes"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, completed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkSessionSchema = createInsertSchema(workSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkSession = z.infer<typeof insertWorkSessionSchema>;
export type WorkSession = typeof workSessions.$inferSelect;

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

// ==================== DISCORD INTEGRATION ====================

// Discord connections - links platform users to their Discord accounts
export const discordConnections = pgTable("discord_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  discordUserId: varchar("discord_user_id").notNull(),
  discordUsername: varchar("discord_username"),
  discordAvatar: varchar("discord_avatar"),
  guildId: varchar("guild_id"), // The monitored server ID
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  scopes: text("scopes"), // Comma-separated OAuth scopes
  linkedAt: timestamp("linked_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDiscordConnectionSchema = createInsertSchema(discordConnections).omit({
  id: true,
  linkedAt: true,
  updatedAt: true,
});

export type InsertDiscordConnection = z.infer<typeof insertDiscordConnectionSchema>;
export type DiscordConnection = typeof discordConnections.$inferSelect;

// Discord presence sessions - tracks when users are screen sharing
export const discordPresenceSessions = pgTable("discord_presence_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  discordUserId: varchar("discord_user_id").notNull(),
  guildId: varchar("guild_id").notNull(),
  channelId: varchar("channel_id").notNull(),
  channelName: varchar("channel_name"),
  isScreenSharing: boolean("is_screen_sharing").default(false),
  isStreaming: boolean("is_streaming").default(false),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  lastHeartbeatAt: timestamp("last_heartbeat_at").defaultNow(),
});

export const insertDiscordPresenceSessionSchema = createInsertSchema(discordPresenceSessions).omit({
  id: true,
  startedAt: true,
  lastHeartbeatAt: true,
});

export type InsertDiscordPresenceSession = z.infer<typeof insertDiscordPresenceSessionSchema>;
export type DiscordPresenceSession = typeof discordPresenceSessions.$inferSelect;

// Discord settings - admin configuration for the Discord integration
export const discordSettings = pgTable("discord_settings", {
  id: serial("id").primaryKey(),
  guildId: varchar("guild_id").notNull(),
  guildName: varchar("guild_name"),
  monitoredChannelIds: text("monitored_channel_ids"), // Comma-separated channel IDs
  botConnected: boolean("bot_connected").default(false),
  lastBotHeartbeat: timestamp("last_bot_heartbeat"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDiscordSettingsSchema = createInsertSchema(discordSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDiscordSettings = z.infer<typeof insertDiscordSettingsSchema>;
export type DiscordSettings = typeof discordSettings.$inferSelect;

// ==================== ORDER TEMPLATES ====================

// Order templates - pre-defined order configurations for clients
export const orderTemplates = pgTable("order_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  orderType: varchar("order_type", { length: 50 }).$type<ContentOrderType>().notNull(),
  defaultTitle: varchar("default_title", { length: 255 }),
  defaultDescription: text("default_description"),
  defaultSpecifications: text("default_specifications"),
  estimatedCost: integer("estimated_cost"), // Suggested cost in cents
  estimatedDays: integer("estimated_days"), // Estimated delivery time
  priority: varchar("priority", { length: 20 }).default("normal"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrderTemplateSchema = createInsertSchema(orderTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrderTemplate = z.infer<typeof insertOrderTemplateSchema>;
export type OrderTemplate = typeof orderTemplates.$inferSelect;

// Saved orders - client's saved/favorite order configurations
export const savedOrders = pgTable("saved_orders", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  orderType: varchar("order_type", { length: 50 }).$type<ContentOrderType>().notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  specifications: text("specifications"),
  creditCost: integer("credit_cost"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  clientNotes: text("client_notes"),
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSavedOrderSchema = createInsertSchema(savedOrders).omit({
  id: true,
  usageCount: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSavedOrder = z.infer<typeof insertSavedOrderSchema>;
export type SavedOrder = typeof savedOrders.$inferSelect;

// ==================== TASK MESSAGES ====================

// Task messages - client-team communication on orders/tasks
export const taskMessages = pgTable("task_messages", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => contentTasks.id, { onDelete: "cascade" }),
  orderId: integer("order_id").references(() => contentOrders.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderRole: varchar("sender_role", { length: 20 }).$type<UserRole>().notNull(), // who sent it: client, content, admin
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"), // optional file attachment
  attachmentName: varchar("attachment_name", { length: 255 }),
  isInternal: boolean("is_internal").default(false), // true = only visible to team, false = visible to client
  readByClient: boolean("read_by_client").default(false),
  readByTeam: boolean("read_by_team").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskMessageSchema = createInsertSchema(taskMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskMessage = z.infer<typeof insertTaskMessageSchema>;
export type TaskMessage = typeof taskMessages.$inferSelect;

// ==================== DELIVERABLE ANNOTATIONS ====================

// Deliverable annotations - comments and feedback on specific deliverables
export const deliverableAnnotations = pgTable("deliverable_annotations", {
  id: serial("id").primaryKey(),
  deliverableId: integer("deliverable_id").notNull().references(() => deliverables.id, { onDelete: "cascade" }),
  versionId: integer("version_id").references(() => deliverableVersions.id, { onDelete: "cascade" }), // optional, for version-specific annotations
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  annotationType: varchar("annotation_type", { length: 20 }).default("comment"), // comment, revision_request, approval, rejection
  status: varchar("status", { length: 20 }).default("open"), // open, resolved, acknowledged
  positionX: integer("position_x"), // optional for positional annotations (e.g., on images)
  positionY: integer("position_y"),
  resolvedBy: varchar("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeliverableAnnotationSchema = createInsertSchema(deliverableAnnotations).omit({
  id: true,
  resolvedAt: true,
  createdAt: true,
});

export type InsertDeliverableAnnotation = z.infer<typeof insertDeliverableAnnotationSchema>;
export type DeliverableAnnotation = typeof deliverableAnnotations.$inferSelect;

// ==================== CLIENT PROFILES ====================

// Relationship statuses for clients/partners
export const clientRelationshipStatuses = ["active", "prospect", "partner", "inactive", "paused"] as const;
export type ClientRelationshipStatus = typeof clientRelationshipStatuses[number];

// Client profiles - central directory for all clients/partners
export const clientProfiles = pgTable("client_profiles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(), // URL-friendly identifier
  description: text("description"),
  industry: varchar("industry", { length: 100 }), // e.g., "NFT", "DeFi", "Gaming", "Media"
  relationshipStatus: varchar("relationship_status", { length: 50 }).$type<ClientRelationshipStatus>().default("active"),
  keyContacts: jsonb("key_contacts").$type<Array<{name: string; role?: string; email?: string; telegram?: string; discord?: string}>>().default([]),
  projectHistory: text("project_history"), // Notes about past work and projects
  notes: text("notes"), // General notes
  logoUrl: text("logo_url"),
  website: text("website"),
  socialLinks: jsonb("social_links").$type<{twitter?: string; discord?: string; telegram?: string; farcaster?: string}>(),
  tags: text("tags").array(), // For categorization
  color: varchar("color", { length: 20 }).default("#6366F1"), // Brand color for UI
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientProfileSchema = createInsertSchema(clientProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientProfile = z.infer<typeof insertClientProfileSchema>;
export type ClientProfile = typeof clientProfiles.$inferSelect;

// ==================== CLIENT CALENDAR EVENTS ====================

// Calendar event types
export const calendarEventTypes = ["deadline", "milestone", "meeting", "deliverable", "launch", "review", "other"] as const;
export type CalendarEventType = typeof calendarEventTypes[number];

// Client calendar events - per-client content calendars
export const clientCalendarEvents = pgTable("client_calendar_events", {
  id: serial("id").primaryKey(),
  clientProfileId: integer("client_profile_id").notNull().references(() => clientProfiles.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  eventType: varchar("event_type", { length: 50 }).$type<CalendarEventType>().default("other"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  allDay: boolean("all_day").default(false),
  color: varchar("color", { length: 20 }), // Override client's default color
  googleCalendarEventId: varchar("google_calendar_event_id", { length: 255 }), // For bidirectional sync
  googleCalendarId: varchar("google_calendar_id", { length: 255 }), // Which Google Calendar this syncs to
  syncStatus: varchar("sync_status", { length: 20 }).default("pending"), // pending, synced, error
  lastSyncedAt: timestamp("last_synced_at"),
  relatedTaskId: integer("related_task_id").references(() => contentTasks.id, { onDelete: "set null" }),
  relatedOrderId: integer("related_order_id").references(() => contentOrders.id, { onDelete: "set null" }),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientCalendarEventSchema = createInsertSchema(clientCalendarEvents).omit({
  id: true,
  lastSyncedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientCalendarEvent = z.infer<typeof insertClientCalendarEventSchema>;
export type ClientCalendarEvent = typeof clientCalendarEvents.$inferSelect;

// ==================== CLIENT PROFILE LINKS ====================

// Link content tasks and orders to client profiles
export const clientTaskLinks = pgTable("client_task_links", {
  id: serial("id").primaryKey(),
  clientProfileId: integer("client_profile_id").notNull().references(() => clientProfiles.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => contentTasks.id, { onDelete: "cascade" }),
  orderId: integer("order_id").references(() => contentOrders.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientTaskLinkSchema = createInsertSchema(clientTaskLinks).omit({
  id: true,
  createdAt: true,
});

export type InsertClientTaskLink = z.infer<typeof insertClientTaskLinkSchema>;
export type ClientTaskLink = typeof clientTaskLinks.$inferSelect;

// ==================== INTERNAL TEAM MEMBERS ====================

export const teamMemberRoles = [
  "founder",
  "lead",
  "developer",
  "designer", 
  "content_creator",
  "community_manager",
  "business_development",
  "marketing",
  "artist",
  "video_editor",
  "writer",
  "project_manager",
  "operations",
  "advisor",
  "contributor",
  "other"
] as const;

export const teamMemberDepartments = [
  "leadership",
  "engineering",
  "content",
  "design",
  "community",
  "business",
  "operations",
  "general"
] as const;

export const paymentMethods = [
  "crypto_base",
  "crypto_eth",
  "crypto_sol",
  "venmo",
  "paypal",
  "wells_fargo",
  "bank_transfer",
  "other"
] as const;

export const employmentTypes = [
  "full_time",
  "part_time",
  "contractor",
  "intern",
  "shadow",
  "advisor",
  "volunteer"
] as const;
export type EmploymentType = typeof employmentTypes[number];

export const internalTeamMembers = pgTable("internal_team_members", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nickname: varchar("nickname", { length: 100 }), // Display name / alias
  role: varchar("role", { length: 50 }).default("contributor"),
  department: varchar("department", { length: 50 }).default("general"),
  employmentType: varchar("employment_type", { length: 20 }).$type<EmploymentType>().default("full_time"),
  supervisorId: integer("supervisor_id"), // Self-reference to another team member
  currentFocus: text("current_focus"), // What interns/shadows are working on
  walletAddress: varchar("wallet_address", { length: 255 }),
  walletChain: varchar("wallet_chain", { length: 20 }).default("base"), // base, eth, sol
  payRate: real("pay_rate").default(0), // Weekly/monthly rate in USD
  payFrequency: varchar("pay_frequency", { length: 20 }).default("weekly"), // weekly, monthly, per_task
  paymentMethod: varchar("payment_method", { length: 50 }).default("crypto_base"),
  paymentNotes: text("payment_notes"), // Special payment instructions
  email: varchar("email", { length: 255 }),
  telegram: varchar("telegram", { length: 100 }),
  discord: varchar("discord", { length: 100 }),
  twitter: varchar("twitter", { length: 100 }),
  skills: text("skills").array(), // Array of skill tags
  bio: text("bio"),
  notes: text("notes"),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  status: varchar("status", { length: 20 }).default("active"), // active, inactive, on_hold
  startDate: timestamp("start_date"),
  linkedUserId: varchar("linked_user_id").references(() => users.id, { onDelete: "set null" }), // Link to platform user
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInternalTeamMemberSchema = createInsertSchema(internalTeamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInternalTeamMember = z.infer<typeof insertInternalTeamMemberSchema>;
export type InternalTeamMember = typeof internalTeamMembers.$inferSelect;

// ==================== TEAM PAYMENT HISTORY ====================

export const teamPaymentHistory = pgTable("team_payment_history", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => internalTeamMembers.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("USDC"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  txHash: varchar("tx_hash", { length: 255 }), // Blockchain transaction hash if crypto
  description: text("description"),
  paymentDate: timestamp("payment_date").defaultNow(),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  status: varchar("status", { length: 20 }).default("completed"), // pending, completed, failed
  processedBy: varchar("processed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamPaymentHistorySchema = createInsertSchema(teamPaymentHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertTeamPaymentHistory = z.infer<typeof insertTeamPaymentHistorySchema>;
export type TeamPaymentHistory = typeof teamPaymentHistory.$inferSelect;

// ==================== TEAM MEMBER CLIENT ASSIGNMENTS ====================

export const teamMemberClientAssignments = pgTable("team_member_client_assignments", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => internalTeamMembers.id, { onDelete: "cascade" }),
  clientProfileId: integer("client_profile_id").references(() => clientProfiles.id, { onDelete: "cascade" }),
  clientUserId: varchar("client_user_id").references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }), // account_manager, lead, support, etc.
  isPrimary: boolean("is_primary").default(false), // Primary contact for this client
  notes: text("notes"),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const insertTeamMemberClientAssignmentSchema = createInsertSchema(teamMemberClientAssignments).omit({
  id: true,
  assignedAt: true,
});

export type InsertTeamMemberClientAssignment = z.infer<typeof insertTeamMemberClientAssignmentSchema>;
export type TeamMemberClientAssignment = typeof teamMemberClientAssignments.$inferSelect;

// ==================== CONTENT IDEAS (Pre-Production Approval) ====================

export const contentIdeaStatuses = ["pending", "approved", "denied", "in_production", "completed"] as const;
export type ContentIdeaStatus = typeof contentIdeaStatuses[number];

export const contentIdeas = pgTable("content_ideas", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(), // article, video, social_post, etc.
  estimatedCost: integer("estimated_cost"), // Cost in cents
  estimatedDays: integer("estimated_days"), // Estimated delivery time
  status: varchar("status", { length: 20 }).$type<ContentIdeaStatus>().notNull().default("pending"),
  clientNotes: text("client_notes"), // Feedback from client
  teamNotes: text("team_notes"), // Internal notes
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  attachmentUrls: text("attachment_urls"), // JSON array of reference URLs/images
  relatedTaskId: integer("related_task_id").references(() => contentTasks.id, { onDelete: "set null" }),
  relatedOrderId: integer("related_order_id").references(() => contentOrders.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  deniedAt: timestamp("denied_at"),
  deniedBy: varchar("denied_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContentIdeaSchema = createInsertSchema(contentIdeas).omit({
  id: true,
  status: true,
  relatedTaskId: true,
  relatedOrderId: true,
  approvedAt: true,
  approvedBy: true,
  deniedAt: true,
  deniedBy: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContentIdea = z.infer<typeof insertContentIdeaSchema>;
export type ContentIdea = typeof contentIdeas.$inferSelect;

// ==================== TEAM STRUCTURE TEMPLATES ====================

export const teamStructureTemplates = pgTable("team_structure_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  teamData: jsonb("team_data").notNull(), // JSON array of team members
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  isDefault: boolean("is_default").default(false), // Mark one as the default template
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTeamStructureTemplateSchema = createInsertSchema(teamStructureTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeamStructureTemplate = z.infer<typeof insertTeamStructureTemplateSchema>;
export type TeamStructureTemplate = typeof teamStructureTemplates.$inferSelect;

// ==================== SAVED ITEMS (Pinned Content) ====================

export const savedItemTypes = ["task", "client", "deliverable", "order", "member", "idea"] as const;
export type SavedItemType = typeof savedItemTypes[number];

export const savedItems = pgTable("saved_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemType: varchar("item_type", { length: 20 }).$type<SavedItemType>().notNull(),
  itemId: integer("item_id").notNull(), // ID of the saved item (task, client, etc.)
  notes: text("notes"), // Optional user notes about why they saved it
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSavedItemSchema = createInsertSchema(savedItems).omit({
  id: true,
  createdAt: true,
});

export type InsertSavedItem = z.infer<typeof insertSavedItemSchema>;
export type SavedItem = typeof savedItems.$inferSelect;

// ==================== FEEDBACK SUBMISSIONS ====================

export const feedbackCategories = ["quality", "communication", "timeline", "creativity", "overall"] as const;
export type FeedbackCategory = typeof feedbackCategories[number];

export const feedbackSubmissions = pgTable("feedback_submissions", {
  id: serial("id").primaryKey(),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: varchar("target_type", { length: 30 }).notNull(), // deliverable, task, order, member
  targetId: integer("target_id").notNull(),
  category: varchar("category", { length: 30 }).$type<FeedbackCategory>().notNull(),
  rating: integer("rating").notNull(), // 1-5 star rating
  comment: text("comment"),
  isPublic: boolean("is_public").default(false), // Whether visible to client
  respondedBy: varchar("responded_by").references(() => users.id, { onDelete: "set null" }),
  responseText: text("response_text"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeedbackSubmissionSchema = createInsertSchema(feedbackSubmissions).omit({
  id: true,
  respondedBy: true,
  responseText: true,
  respondedAt: true,
  createdAt: true,
});

export type InsertFeedbackSubmission = z.infer<typeof insertFeedbackSubmissionSchema>;
export type FeedbackSubmission = typeof feedbackSubmissions.$inferSelect;

// ==================== YOUTUBE REFERENCES ====================

export const youtubeReferences = pgTable("youtube_references", {
  id: serial("id").primaryKey(),
  addedBy: varchar("added_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: varchar("target_type", { length: 30 }).notNull(), // client, task, order, idea
  targetId: integer("target_id"), // Can be null for global/team references
  targetStringId: varchar("target_string_id", { length: 255 }), // For string-based IDs like client profiles
  videoUrl: varchar("video_url", { length: 500 }).notNull(),
  videoId: varchar("video_id", { length: 50 }).notNull(), // YouTube video ID for embedding
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  category: varchar("category", { length: 50 }), // reference, tutorial, inspiration, brief
  tags: text("tags"), // JSON array of tags
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertYoutubeReferenceSchema = createInsertSchema(youtubeReferences).omit({
  id: true,
  createdAt: true,
});

export type InsertYoutubeReference = z.infer<typeof insertYoutubeReferenceSchema>;
export type YoutubeReference = typeof youtubeReferences.$inferSelect;

// ==================== BURNDOWN DATA (Task Completion Snapshots) ====================

export const burndownSnapshots = pgTable("burndown_snapshots", {
  id: serial("id").primaryKey(),
  snapshotDate: timestamp("snapshot_date").notNull(),
  totalTasks: integer("total_tasks").notNull(),
  completedTasks: integer("completed_tasks").notNull(),
  inProgressTasks: integer("in_progress_tasks").notNull(),
  blockedTasks: integer("blocked_tasks").notNull(),
  pendingTasks: integer("pending_tasks").notNull(),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  metadata: jsonb("metadata"), // Additional context like priority breakdown
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBurndownSnapshotSchema = createInsertSchema(burndownSnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertBurndownSnapshot = z.infer<typeof insertBurndownSnapshotSchema>;
export type BurndownSnapshot = typeof burndownSnapshots.$inferSelect;

// ==================== ASSET LIBRARY ENHANCED ====================

export const assetCategories = ["image", "video", "audio", "document", "template", "brand", "other"] as const;
export type AssetCategory = typeof assetCategories[number];

export const libraryAssets = pgTable("library_assets", {
  id: serial("id").primaryKey(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  fileType: varchar("file_type", { length: 50 }).notNull(), // MIME type
  fileSize: integer("file_size"), // Size in bytes
  category: varchar("category", { length: 30 }).$type<AssetCategory>().notNull(),
  tags: text("tags"), // JSON array of tags
  clientProfileId: integer("client_profile_id").references(() => clientProfiles.id, { onDelete: "set null" }),
  isPublic: boolean("is_public").default(false), // Team-wide visibility
  isFavorite: boolean("is_favorite").default(false),
  usageCount: integer("usage_count").default(0), // Track how often asset is used
  metadata: jsonb("metadata"), // Width, height, duration, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLibraryAssetSchema = createInsertSchema(libraryAssets).omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLibraryAsset = z.infer<typeof insertLibraryAssetSchema>;
export type LibraryAsset = typeof libraryAssets.$inferSelect;

// ==================== TASK SUBTASKS ====================
// Subtasks/checklists for both personal tasks and content tasks

export const taskSubtasks = pgTable("task_subtasks", {
  id: serial("id").primaryKey(),
  taskType: varchar("task_type", { length: 20 }).notNull(), // "personal" or "content"
  taskId: integer("task_id").notNull(),
  title: text("title").notNull(),
  isCompleted: boolean("is_completed").default(false),
  sortOrder: integer("sort_order").default(0),
  assignedTo: varchar("assigned_to", { length: 255 }),
  dueDate: text("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertTaskSubtaskSchema = createInsertSchema(taskSubtasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertTaskSubtask = z.infer<typeof insertTaskSubtaskSchema>;
export type TaskSubtask = typeof taskSubtasks.$inferSelect;

// ==================== TASK PRIORITY & TIME TRACKING (Enhanced Personal Tasks) ====================

export const taskPriorities = ["urgent", "high", "normal", "low"] as const;
export type TaskPriority = typeof taskPriorities[number];

// Enhanced fields stored in a separate table to avoid breaking existing tasks table
export const taskEnhancements = pgTable("task_enhancements", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  priority: varchar("priority", { length: 20 }).$type<TaskPriority>().default("normal"),
  estimatedMinutes: integer("estimated_minutes"),
  actualMinutes: integer("actual_minutes").default(0),
  clientProfileId: integer("client_profile_id").references(() => clientProfiles.id, { onDelete: "set null" }),
  description: text("description"),
  tags: text("tags"), // JSON array
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const insertTaskEnhancementSchema = createInsertSchema(taskEnhancements).omit({
  id: true,
});

export type InsertTaskEnhancement = z.infer<typeof insertTaskEnhancementSchema>;
export type TaskEnhancement = typeof taskEnhancements.$inferSelect;

// ==================== CLIENT DOCUMENTS (Docs Hub) ====================

export const documentCategories = ["contract", "brief", "notes", "guidelines", "reference", "legal", "other"] as const;
export type DocumentCategory = typeof documentCategories[number];

export const clientDocuments = pgTable("client_documents", {
  id: serial("id").primaryKey(),
  clientProfileId: integer("client_profile_id").notNull().references(() => clientProfiles.id, { onDelete: "cascade" }),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(), // MIME type
  fileSize: integer("file_size"), // Size in bytes
  category: varchar("category", { length: 30 }).$type<DocumentCategory>().default("other"),
  tags: text("tags"), // JSON array
  version: integer("version").default(1),
  parentDocumentId: integer("parent_document_id"), // For versioning, references previous version
  linkedBrandPackId: integer("linked_brand_pack_id").references(() => clientBrandPacks.id, { onDelete: "set null" }),
  linkedTaskId: integer("linked_task_id").references(() => contentTasks.id, { onDelete: "set null" }),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientDocumentSchema = createInsertSchema(clientDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientDocument = z.infer<typeof insertClientDocumentSchema>;
export type ClientDocument = typeof clientDocuments.$inferSelect;

// ==================== WHITEBOARDS ====================

export const whiteboards = pgTable("whiteboards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  clientProfileId: integer("client_profile_id").references(() => clientProfiles.id, { onDelete: "set null" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  thumbnail: text("thumbnail"), // Base64 or URL for preview
  isPublic: boolean("is_public").default(false),
  backgroundColor: varchar("background_color", { length: 20 }).default("#ffffff"),
  gridEnabled: boolean("grid_enabled").default(true),
  zoom: real("zoom").default(1),
  panX: real("pan_x").default(0),
  panY: real("pan_y").default(0),
  lastEditedBy: varchar("last_edited_by").references(() => users.id),
  lastEditedAt: timestamp("last_edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWhiteboardSchema = createInsertSchema(whiteboards).omit({
  id: true,
  lastEditedBy: true,
  lastEditedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWhiteboard = z.infer<typeof insertWhiteboardSchema>;
export type Whiteboard = typeof whiteboards.$inferSelect;

// ==================== WHITEBOARD ELEMENTS ====================

export const elementTypes = ["rectangle", "ellipse", "diamond", "text", "sticky", "arrow", "line", "image", "task"] as const;
export type ElementType = typeof elementTypes[number];

export const whiteboardElements = pgTable("whiteboard_elements", {
  id: serial("id").primaryKey(),
  whiteboardId: integer("whiteboard_id").notNull().references(() => whiteboards.id, { onDelete: "cascade" }),
  elementType: varchar("element_type", { length: 30 }).$type<ElementType>().notNull(),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  width: real("width").notNull().default(100),
  height: real("height").notNull().default(100),
  rotation: real("rotation").default(0),
  content: text("content"), // Text content for text/sticky elements
  style: jsonb("style"), // Fill, stroke, font, etc.
  zIndex: integer("z_index").default(0),
  locked: boolean("locked").default(false),
  groupId: varchar("group_id", { length: 100 }), // For grouping elements
  linkedTaskId: integer("linked_task_id").references(() => contentTasks.id, { onDelete: "set null" }),
  linkedPersonalTaskId: integer("linked_personal_task_id").references(() => tasks.id, { onDelete: "set null" }),
  metadata: jsonb("metadata"), // Additional element-specific data
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWhiteboardElementSchema = createInsertSchema(whiteboardElements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWhiteboardElement = z.infer<typeof insertWhiteboardElementSchema>;
export type WhiteboardElement = typeof whiteboardElements.$inferSelect;

// ==================== WHITEBOARD CONNECTORS ====================

export const whiteboardConnectors = pgTable("whiteboard_connectors", {
  id: serial("id").primaryKey(),
  whiteboardId: integer("whiteboard_id").notNull().references(() => whiteboards.id, { onDelete: "cascade" }),
  fromElementId: integer("from_element_id").notNull().references(() => whiteboardElements.id, { onDelete: "cascade" }),
  toElementId: integer("to_element_id").notNull().references(() => whiteboardElements.id, { onDelete: "cascade" }),
  fromAnchor: varchar("from_anchor", { length: 20 }).default("center"), // top, bottom, left, right, center
  toAnchor: varchar("to_anchor", { length: 20 }).default("center"),
  style: jsonb("style"), // Line style, arrow heads, color
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWhiteboardConnectorSchema = createInsertSchema(whiteboardConnectors).omit({
  id: true,
  createdAt: true,
});

export type InsertWhiteboardConnector = z.infer<typeof insertWhiteboardConnectorSchema>;
export type WhiteboardConnector = typeof whiteboardConnectors.$inferSelect;

// ==================== WHITEBOARD COLLABORATORS ====================

export const whiteboardCollaborators = pgTable("whiteboard_collaborators", {
  id: serial("id").primaryKey(),
  whiteboardId: integer("whiteboard_id").notNull().references(() => whiteboards.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permission: varchar("permission", { length: 20 }).default("edit"), // view, comment, edit
  cursorX: real("cursor_x"),
  cursorY: real("cursor_y"),
  isActive: boolean("is_active").default(false),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWhiteboardCollaboratorSchema = createInsertSchema(whiteboardCollaborators).omit({
  id: true,
  cursorX: true,
  cursorY: true,
  isActive: true,
  lastActiveAt: true,
  createdAt: true,
});

export type InsertWhiteboardCollaborator = z.infer<typeof insertWhiteboardCollaboratorSchema>;
export type WhiteboardCollaborator = typeof whiteboardCollaborators.$inferSelect;

// ==================== DAO MANAGEMENT SYSTEM ====================

// DAO Roles (6 tiers: Contributor → Senior Partner)
export const daoRoles = pgTable("dao_roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  tier: integer("tier").notNull(), // 1-6
  multiplier: real("multiplier").notNull().default(1.0), // Performance multiplier for bonuses
  cumulativeRevenueRequired: integer("cumulative_revenue_required").notNull().default(0), // USD threshold
  description: text("description"),
  isCouncilEligible: boolean("is_council_eligible").default(false), // Only Senior Partners can be council
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDaoRoleSchema = createInsertSchema(daoRoles).omit({ id: true, createdAt: true });
export type InsertDaoRole = z.infer<typeof insertDaoRoleSchema>;
export type DaoRole = typeof daoRoles.$inferSelect;

// DAO Memberships (links users/team members to DAO roles)
export const daoMemberships = pgTable("dao_memberships", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  internalTeamMemberId: integer("internal_team_member_id").references(() => internalTeamMembers.id, { onDelete: "cascade" }),
  daoRoleId: integer("dao_role_id").notNull().references(() => daoRoles.id),
  isCouncil: boolean("is_council").default(false), // One of the 6 council members
  cumulativeRevenue: integer("cumulative_revenue").default(0), // Total attributed revenue in cents
  activeFrom: timestamp("active_from").defaultNow(),
  activeTo: timestamp("active_to"), // null = still active
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDaoMembershipSchema = createInsertSchema(daoMemberships).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDaoMembership = z.infer<typeof insertDaoMembershipSchema>;
export type DaoMembership = typeof daoMemberships.$inferSelect;

// Service Categories
export const daoServiceCategories = ["strategy_consulting", "development", "design_ux", "marketing_growth", "retainers"] as const;
export type DaoServiceCategory = typeof daoServiceCategories[number];

// DAO Service Catalog (all 15+ standardized services)
export const daoServiceCatalog = pgTable("dao_service_catalog", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 30 }).$type<DaoServiceCategory>().notNull(),
  serviceName: varchar("service_name", { length: 100 }).notNull(),
  description: text("description"),
  scope: text("scope"), // What's included
  deliverables: text("deliverables"), // What client receives
  idealFor: text("ideal_for"), // Target audience
  pricingTier1Name: varchar("pricing_tier1_name", { length: 50 }), // e.g., "Foundation", "Startup", "Basic"
  pricingTier1Min: integer("pricing_tier1_min"), // In cents
  pricingTier1Max: integer("pricing_tier1_max"),
  pricingTier1Duration: varchar("pricing_tier1_duration", { length: 50 }), // e.g., "2-3 weeks"
  pricingTier2Name: varchar("pricing_tier2_name", { length: 50 }),
  pricingTier2Min: integer("pricing_tier2_min"),
  pricingTier2Max: integer("pricing_tier2_max"),
  pricingTier2Duration: varchar("pricing_tier2_duration", { length: 50 }),
  pricingTier3Name: varchar("pricing_tier3_name", { length: 50 }),
  pricingTier3Min: integer("pricing_tier3_min"),
  pricingTier3Max: integer("pricing_tier3_max"),
  pricingTier3Duration: varchar("pricing_tier3_duration", { length: 50 }),
  isRetainer: boolean("is_retainer").default(false), // Monthly pricing
  depositPercent: integer("deposit_percent").default(30),
  midpointPercent: integer("midpoint_percent").default(40),
  completionPercent: integer("completion_percent").default(30),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDaoServiceCatalogSchema = createInsertSchema(daoServiceCatalog).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDaoServiceCatalog = z.infer<typeof insertDaoServiceCatalogSchema>;
export type DaoServiceCatalog = typeof daoServiceCatalog.$inferSelect;

// DAO Discounts
export const daoDiscountTypes = ["dao_to_dao", "multi_service_bundle", "long_term_retainer", "referral", "custom"] as const;
export type DaoDiscountType = typeof daoDiscountTypes[number];

export const daoDiscounts = pgTable("dao_discounts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  discountType: varchar("discount_type", { length: 30 }).$type<DaoDiscountType>().notNull(),
  percentOff: integer("percent_off").notNull(), // e.g., 10, 15, 20
  conditions: text("conditions"), // Requirements to qualify
  isActive: boolean("is_active").default(true),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDaoDiscountSchema = createInsertSchema(daoDiscounts).omit({ id: true, createdAt: true });
export type InsertDaoDiscount = z.infer<typeof insertDaoDiscountSchema>;
export type DaoDiscount = typeof daoDiscounts.$inferSelect;

// DAO Project Statuses
export const daoProjectStatuses = ["proposal", "negotiation", "contract_pending", "active", "on_hold", "completed", "cancelled"] as const;
export type DaoProjectStatus = typeof daoProjectStatuses[number];

// DAO Projects (client engagements)
export const daoProjects = pgTable("dao_projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  clientProfileId: integer("client_profile_id").references(() => clientProfiles.id, { onDelete: "set null" }),
  status: varchar("status", { length: 30 }).$type<DaoProjectStatus>().default("proposal"),
  leadMembershipId: integer("lead_membership_id").references(() => daoMemberships.id), // Team Lead (30%)
  pmMembershipId: integer("pm_membership_id").references(() => daoMemberships.id), // Project Manager (15%)
  discountId: integer("discount_id").references(() => daoDiscounts.id, { onDelete: "set null" }),
  totalQuotedAmount: integer("total_quoted_amount"), // In cents before discount
  discountAmount: integer("discount_amount").default(0), // Discount applied
  finalAmount: integer("final_amount"), // Total after discount
  currency: varchar("currency", { length: 10 }).default("USD"),
  depositPercent: integer("deposit_percent").default(30),
  midpointPercent: integer("midpoint_percent").default(40),
  completionPercent: integer("completion_percent").default(30),
  kickoffDate: timestamp("kickoff_date"),
  targetCompletionDate: timestamp("target_completion_date"),
  actualCompletionDate: timestamp("actual_completion_date"),
  treasuryContribution: integer("treasury_contribution"), // 15% of final amount
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDaoProjectSchema = createInsertSchema(daoProjects).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDaoProject = z.infer<typeof insertDaoProjectSchema>;
export type DaoProject = typeof daoProjects.$inferSelect;

// DAO Project Services (links projects to catalog services)
export const daoProjectServices = pgTable("dao_project_services", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => daoProjects.id, { onDelete: "cascade" }),
  serviceCatalogId: integer("service_catalog_id").notNull().references(() => daoServiceCatalog.id),
  selectedTier: integer("selected_tier").default(1), // 1, 2, or 3
  customPrice: integer("custom_price"), // Override catalog price if negotiated
  quantity: integer("quantity").default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDaoProjectServiceSchema = createInsertSchema(daoProjectServices).omit({ id: true, createdAt: true });
export type InsertDaoProjectService = z.infer<typeof insertDaoProjectServiceSchema>;
export type DaoProjectService = typeof daoProjectServices.$inferSelect;

// Revenue Attribution Role Slots
export const attributionRoleSlots = ["lead", "pm", "core", "support", "overhead"] as const;
export type AttributionRoleSlot = typeof attributionRoleSlots[number];

// DAO Revenue Attributions (per-member revenue allocation)
export const daoRevenueAttributions = pgTable("dao_revenue_attributions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => daoProjects.id, { onDelete: "cascade" }),
  membershipId: integer("membership_id").notNull().references(() => daoMemberships.id),
  roleSlot: varchar("role_slot", { length: 20 }).$type<AttributionRoleSlot>().notNull(),
  percentAllocation: real("percent_allocation").notNull(), // e.g., 30 for lead, 15 for PM
  attributedAmount: integer("attributed_amount"), // Calculated from project final amount
  performanceMultiplier: real("performance_multiplier").default(1.0),
  notes: text("notes"),
  isApproved: boolean("is_approved").default(false),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDaoRevenueAttributionSchema = createInsertSchema(daoRevenueAttributions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDaoRevenueAttribution = z.infer<typeof insertDaoRevenueAttributionSchema>;
export type DaoRevenueAttribution = typeof daoRevenueAttributions.$inferSelect;

// DAO Project Debriefs
export const daoDebriefs = pgTable("dao_debriefs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => daoProjects.id, { onDelete: "cascade" }),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  whatWentWell: text("what_went_well"),
  whatCouldImprove: text("what_could_improve"),
  lessonsLearned: text("lessons_learned"),
  attributionConfirmed: boolean("attribution_confirmed").default(false),
  attendees: text("attendees"), // JSON array of membership IDs
  attachmentUrl: text("attachment_url"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDaoDebriefSchema = createInsertSchema(daoDebriefs).omit({ id: true, createdAt: true });
export type InsertDaoDebrief = z.infer<typeof insertDaoDebriefSchema>;
export type DaoDebrief = typeof daoDebriefs.$inferSelect;

// DAO Treasury
export const daoTreasury = pgTable("dao_treasury", {
  id: serial("id").primaryKey(),
  balance: integer("balance").notNull().default(0), // Current balance in cents
  lastBonusTriggerBalance: integer("last_bonus_trigger_balance").default(0),
  bonusTriggerThreshold: integer("bonus_trigger_threshold").default(10000000), // $100,000 in cents
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DaoTreasury = typeof daoTreasury.$inferSelect;

// Treasury Transaction Types
export const treasuryTxnTypes = ["project_inflow", "bonus_outflow", "adjustment", "expense"] as const;
export type TreasuryTxnType = typeof treasuryTxnTypes[number];

// DAO Treasury Transactions
export const daoTreasuryTransactions = pgTable("dao_treasury_transactions", {
  id: serial("id").primaryKey(),
  txnType: varchar("txn_type", { length: 30 }).$type<TreasuryTxnType>().notNull(),
  amount: integer("amount").notNull(), // Positive for inflows, negative for outflows
  projectId: integer("project_id").references(() => daoProjects.id, { onDelete: "set null" }),
  bonusRunId: integer("bonus_run_id"), // References bonus runs
  memo: text("memo"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDaoTreasuryTransactionSchema = createInsertSchema(daoTreasuryTransactions).omit({ id: true, createdAt: true });
export type InsertDaoTreasuryTransaction = z.infer<typeof insertDaoTreasuryTransactionSchema>;
export type DaoTreasuryTransaction = typeof daoTreasuryTransactions.$inferSelect;

// DAO Bonus Runs (triggered when treasury hits threshold)
export const daoBonusRuns = pgTable("dao_bonus_runs", {
  id: serial("id").primaryKey(),
  treasuryBalanceBefore: integer("treasury_balance_before").notNull(),
  totalDistributed: integer("total_distributed").notNull(),
  treasuryBalanceAfter: integer("treasury_balance_after").notNull(),
  recipientCount: integer("recipient_count").notNull(),
  triggeredBy: varchar("triggered_by").references(() => users.id),
  notes: text("notes"),
  executedAt: timestamp("executed_at").defaultNow(),
});

export const insertDaoBonusRunSchema = createInsertSchema(daoBonusRuns).omit({ id: true, executedAt: true });
export type InsertDaoBonusRun = z.infer<typeof insertDaoBonusRunSchema>;
export type DaoBonusRun = typeof daoBonusRuns.$inferSelect;

// DAO Bonus Run Recipients
export const daoBonusRunRecipients = pgTable("dao_bonus_run_recipients", {
  id: serial("id").primaryKey(),
  bonusRunId: integer("bonus_run_id").notNull().references(() => daoBonusRuns.id, { onDelete: "cascade" }),
  membershipId: integer("membership_id").notNull().references(() => daoMemberships.id),
  multiplier: real("multiplier").notNull(),
  baseShare: integer("base_share").notNull(), // Before multiplier
  finalAmount: integer("final_amount").notNull(), // After multiplier
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDaoBonusRunRecipientSchema = createInsertSchema(daoBonusRunRecipients).omit({ id: true, createdAt: true });
export type InsertDaoBonusRunRecipient = z.infer<typeof insertDaoBonusRunRecipientSchema>;
export type DaoBonusRunRecipient = typeof daoBonusRunRecipients.$inferSelect;

// Invoice Phases
export const daoInvoicePhases = ["deposit", "midpoint", "completion", "custom"] as const;
export type DaoInvoicePhase = typeof daoInvoicePhases[number];

// Invoice Statuses
export const daoInvoiceStatuses = ["draft", "sent", "paid", "overdue", "cancelled"] as const;
export type DaoInvoiceStatus = typeof daoInvoiceStatuses[number];

// DAO Invoices
export const daoInvoices = pgTable("dao_invoices", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => daoProjects.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  phase: varchar("phase", { length: 20 }).$type<DaoInvoicePhase>().notNull(),
  amount: integer("amount").notNull(), // In cents
  status: varchar("status", { length: 20 }).$type<DaoInvoiceStatus>().default("draft"),
  dueDate: timestamp("due_date"),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 255 }),
  paymentRequestId: integer("payment_request_id").references(() => paymentRequests.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDaoInvoiceSchema = createInsertSchema(daoInvoices).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDaoInvoice = z.infer<typeof insertDaoInvoiceSchema>;
export type DaoInvoice = typeof daoInvoices.$inferSelect;

// DAO Rank Progression (tracks milestone achievements)
export const daoRankProgressions = pgTable("dao_rank_progressions", {
  id: serial("id").primaryKey(),
  membershipId: integer("membership_id").notNull().references(() => daoMemberships.id, { onDelete: "cascade" }),
  fromRoleId: integer("from_role_id").references(() => daoRoles.id),
  toRoleId: integer("to_role_id").notNull().references(() => daoRoles.id),
  cumulativeRevenueAtPromotion: integer("cumulative_revenue_at_promotion").notNull(),
  promotedAt: timestamp("promoted_at").defaultNow(),
  approvedBy: varchar("approved_by").references(() => users.id),
  notes: text("notes"),
});

export const insertDaoRankProgressionSchema = createInsertSchema(daoRankProgressions).omit({ id: true, promotedAt: true });
export type InsertDaoRankProgression = z.infer<typeof insertDaoRankProgressionSchema>;
export type DaoRankProgression = typeof daoRankProgressions.$inferSelect;

// DAO Project Links (connect to content tasks/campaigns)
export const daoProjectLinks = pgTable("dao_project_links", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => daoProjects.id, { onDelete: "cascade" }),
  contentTaskId: integer("content_task_id").references(() => contentTasks.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  linkType: varchar("link_type", { length: 30 }).default("execution"), // execution, reference
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDaoProjectLinkSchema = createInsertSchema(daoProjectLinks).omit({ id: true, createdAt: true });
export type InsertDaoProjectLink = z.infer<typeof insertDaoProjectLinkSchema>;
export type DaoProjectLink = typeof daoProjectLinks.$inferSelect;

// DAO Council Permissions
export const daoPermissionScopes = ["treasury", "catalog", "projects", "invoices", "attribution", "bonuses", "memberships"] as const;
export type DaoPermissionScope = typeof daoPermissionScopes[number];

export const daoPermissions = pgTable("dao_permissions", {
  id: serial("id").primaryKey(),
  membershipId: integer("membership_id").notNull().references(() => daoMemberships.id, { onDelete: "cascade" }),
  scope: varchar("scope", { length: 30 }).$type<DaoPermissionScope>().notNull(),
  canRead: boolean("can_read").default(true),
  canWrite: boolean("can_write").default(false),
  canApprove: boolean("can_approve").default(false),
  councilOnly: boolean("council_only").default(false), // Requires council membership
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDaoPermissionSchema = createInsertSchema(daoPermissions).omit({ id: true, createdAt: true });
export type InsertDaoPermission = z.infer<typeof insertDaoPermissionSchema>;
export type DaoPermission = typeof daoPermissions.$inferSelect;

// Supported EVM Chain IDs for Safe Wallets
export const safeChains = [
  { id: 1, name: "Ethereum", shortName: "eth" },
  { id: 10, name: "Optimism", shortName: "oeth" },
  { id: 56, name: "BNB Smart Chain", shortName: "bnb" },
  { id: 100, name: "Gnosis", shortName: "gno" },
  { id: 137, name: "Polygon", shortName: "matic" },
  { id: 8453, name: "Base", shortName: "base" },
  { id: 42161, name: "Arbitrum One", shortName: "arb1" },
  { id: 43114, name: "Avalanche", shortName: "avax" },
  { id: 11155111, name: "Sepolia", shortName: "sep" },
] as const;

export type SafeChain = typeof safeChains[number];

// DAO Safe Wallets
export const daoSafeWallets = pgTable("dao_safe_wallets", {
  id: serial("id").primaryKey(),
  address: varchar("address", { length: 42 }).notNull(),
  chainId: integer("chain_id").notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  owners: text("owners"), // JSON array of owner addresses
  threshold: integer("threshold"),
  nonce: integer("nonce").default(0),
  isActive: boolean("is_active").default(true),
  addedBy: varchar("added_by").references(() => users.id),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDaoSafeWalletSchema = createInsertSchema(daoSafeWallets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDaoSafeWallet = z.infer<typeof insertDaoSafeWalletSchema>;
export type DaoSafeWallet = typeof daoSafeWallets.$inferSelect;

// Safe Wallet Token Balances (cached)
export const daoSafeBalances = pgTable("dao_safe_balances", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull().references(() => daoSafeWallets.id, { onDelete: "cascade" }),
  tokenAddress: varchar("token_address", { length: 42 }), // null for native token
  tokenSymbol: varchar("token_symbol", { length: 20 }).notNull(),
  tokenName: varchar("token_name", { length: 100 }),
  tokenDecimals: integer("token_decimals").default(18),
  balance: varchar("balance", { length: 78 }).notNull(), // Store as string to handle large numbers
  balanceUsd: real("balance_usd"), // USD value if available
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
});

export const insertDaoSafeBalanceSchema = createInsertSchema(daoSafeBalances).omit({ id: true, lastUpdatedAt: true });
export type InsertDaoSafeBalance = z.infer<typeof insertDaoSafeBalanceSchema>;
export type DaoSafeBalance = typeof daoSafeBalances.$inferSelect;

// Safe Pending Transactions (cached)
export const safeTxStatuses = ["awaiting_confirmations", "awaiting_execution", "executed", "failed", "cancelled"] as const;
export type SafeTxStatus = typeof safeTxStatuses[number];

export const daoSafePendingTxs = pgTable("dao_safe_pending_txs", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull().references(() => daoSafeWallets.id, { onDelete: "cascade" }),
  safeTxHash: varchar("safe_tx_hash", { length: 66 }).notNull(),
  to: varchar("to", { length: 42 }).notNull(),
  value: varchar("value", { length: 78 }).default("0"),
  data: text("data"),
  operation: integer("operation").default(0), // 0 = CALL, 1 = DELEGATECALL
  nonce: integer("nonce").notNull(),
  confirmationsRequired: integer("confirmations_required").notNull(),
  confirmationsCount: integer("confirmations_count").default(0),
  confirmations: text("confirmations"), // JSON array of confirmation objects
  status: varchar("status", { length: 30 }).$type<SafeTxStatus>().default("awaiting_confirmations"),
  submissionDate: timestamp("submission_date"),
  executedAt: timestamp("executed_at"),
  proposedBy: varchar("proposed_by", { length: 42 }),
  description: text("description"),
  daoProjectId: integer("dao_project_id").references(() => daoProjects.id, { onDelete: "set null" }),
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
});

export const insertDaoSafePendingTxSchema = createInsertSchema(daoSafePendingTxs).omit({ id: true, lastSyncedAt: true });
export type InsertDaoSafePendingTx = z.infer<typeof insertDaoSafePendingTxSchema>;
export type DaoSafePendingTx = typeof daoSafePendingTxs.$inferSelect;

// ============================================
// DAO ENHANCED FAIRNESS & ASSIGNMENT SYSTEM
// ============================================

// Skill Proficiency Levels
export const skillProficiencyLevels = ["beginner", "intermediate", "advanced", "expert", "master"] as const;
export type SkillProficiencyLevel = typeof skillProficiencyLevels[number];

// Member Skills - Links members to service categories with proficiency
export const daoMemberSkills = pgTable("dao_member_skills", {
  id: serial("id").primaryKey(),
  membershipId: integer("membership_id").notNull().references(() => daoMemberships.id, { onDelete: "cascade" }),
  serviceCategory: varchar("service_category", { length: 30 }).$type<DaoServiceCategory>().notNull(),
  proficiency: varchar("proficiency", { length: 20 }).$type<SkillProficiencyLevel>().default("beginner"),
  yearsExperience: real("years_experience").default(0),
  projectsCompleted: integer("projects_completed").default(0), // Auto-tracked from completed projects
  notes: text("notes"), // Specific skills within category
  verifiedBy: integer("verified_by").references(() => daoMemberships.id), // Council/senior member verification
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDaoMemberSkillSchema = createInsertSchema(daoMemberSkills).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDaoMemberSkill = z.infer<typeof insertDaoMemberSkillSchema>;
export type DaoMemberSkill = typeof daoMemberSkills.$inferSelect;

// Member Availability Status
export const availabilityStatuses = ["available", "limited", "busy", "unavailable"] as const;
export type AvailabilityStatus = typeof availabilityStatuses[number];

// Member Availability - Track when members can take on work
export const daoMemberAvailability = pgTable("dao_member_availability", {
  id: serial("id").primaryKey(),
  membershipId: integer("membership_id").notNull().references(() => daoMemberships.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).$type<AvailabilityStatus>().default("available"),
  hoursPerWeek: integer("hours_per_week").default(40), // Available hours
  currentActiveProjects: integer("current_active_projects").default(0), // Auto-tracked
  maxConcurrentProjects: integer("max_concurrent_projects").default(3), // Self-set limit
  availableFrom: timestamp("available_from"), // Future availability
  unavailableUntil: timestamp("unavailable_until"), // Vacation/leave
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDaoMemberAvailabilitySchema = createInsertSchema(daoMemberAvailability).omit({ id: true, updatedAt: true });
export type InsertDaoMemberAvailability = z.infer<typeof insertDaoMemberAvailabilitySchema>;
export type DaoMemberAvailability = typeof daoMemberAvailability.$inferSelect;

// Workload Tracking - Historical record of member project assignments
export const daoWorkloadHistory = pgTable("dao_workload_history", {
  id: serial("id").primaryKey(),
  membershipId: integer("membership_id").notNull().references(() => daoMemberships.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => daoProjects.id, { onDelete: "cascade" }),
  roleSlot: varchar("role_slot", { length: 20 }).$type<AttributionRoleSlot>().notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDaoWorkloadHistorySchema = createInsertSchema(daoWorkloadHistory).omit({ id: true, createdAt: true });
export type InsertDaoWorkloadHistory = z.infer<typeof insertDaoWorkloadHistorySchema>;
export type DaoWorkloadHistory = typeof daoWorkloadHistory.$inferSelect;

// Consistency Metrics - Track reliability separate from revenue
export const daoConsistencyMetrics = pgTable("dao_consistency_metrics", {
  id: serial("id").primaryKey(),
  membershipId: integer("membership_id").notNull().references(() => daoMemberships.id, { onDelete: "cascade" }).unique(),
  totalProjectsCompleted: integer("total_projects_completed").default(0),
  onTimeDeliveryCount: integer("on_time_delivery_count").default(0),
  lateDeliveryCount: integer("late_delivery_count").default(0),
  onTimeDeliveryRate: real("on_time_delivery_rate").default(100), // Percentage
  avgPeerRating: real("avg_peer_rating").default(5.0), // 1-5 scale from debriefs
  totalPeerRatings: integer("total_peer_ratings").default(0),
  collaborationScore: real("collaboration_score").default(5.0), // 1-5 from peer feedback
  responsibilityScore: real("responsibility_score").default(5.0), // Meeting deadlines, communication
  qualityScore: real("quality_score").default(5.0), // Work quality feedback
  overallReliabilityScore: real("overall_reliability_score").default(5.0), // Weighted composite
  leadRoleCount: integer("lead_role_count").default(0), // Times assigned as lead
  pmRoleCount: integer("pm_role_count").default(0), // Times assigned as PM
  coreRoleCount: integer("core_role_count").default(0), // Times as core contributor
  supportRoleCount: integer("support_role_count").default(0), // Times as support
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
});

export const insertDaoConsistencyMetricsSchema = createInsertSchema(daoConsistencyMetrics).omit({ id: true, lastUpdatedAt: true });
export type InsertDaoConsistencyMetrics = z.infer<typeof insertDaoConsistencyMetricsSchema>;
export type DaoConsistencyMetrics = typeof daoConsistencyMetrics.$inferSelect;

// Peer Feedback - Collected during debriefs
export const daoPeerFeedback = pgTable("dao_peer_feedback", {
  id: serial("id").primaryKey(),
  debriefId: integer("debrief_id").notNull().references(() => daoDebriefs.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => daoProjects.id, { onDelete: "cascade" }),
  fromMembershipId: integer("from_membership_id").notNull().references(() => daoMemberships.id),
  toMembershipId: integer("to_membership_id").notNull().references(() => daoMemberships.id),
  collaborationRating: integer("collaboration_rating"), // 1-5
  qualityRating: integer("quality_rating"), // 1-5
  reliabilityRating: integer("reliability_rating"), // 1-5
  communicationRating: integer("communication_rating"), // 1-5
  overallRating: integer("overall_rating"), // 1-5
  strengths: text("strengths"),
  improvements: text("improvements"),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDaoPeerFeedbackSchema = createInsertSchema(daoPeerFeedback).omit({ id: true, createdAt: true });
export type InsertDaoPeerFeedback = z.infer<typeof insertDaoPeerFeedbackSchema>;
export type DaoPeerFeedback = typeof daoPeerFeedback.$inferSelect;

// Project Opportunity Queue - Upcoming projects members can see and bid on
export const projectOpportunityStatuses = ["open", "bidding", "assigned", "closed"] as const;
export type ProjectOpportunityStatus = typeof projectOpportunityStatuses[number];

export const daoProjectOpportunities = pgTable("dao_project_opportunities", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => daoProjects.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).$type<ProjectOpportunityStatus>().default("open"),
  visibleToAll: boolean("visible_to_all").default(true), // Or restricted by rank
  minimumRankTier: integer("minimum_rank_tier").default(1), // Minimum rank to bid
  preferredSkillCategories: text("preferred_skill_categories"), // JSON array of service categories
  estimatedStartDate: timestamp("estimated_start_date"),
  applicationDeadline: timestamp("application_deadline"),
  requiresCouncilApproval: boolean("requires_council_approval").default(false), // High-value projects
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDaoProjectOpportunitySchema = createInsertSchema(daoProjectOpportunities).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDaoProjectOpportunity = z.infer<typeof insertDaoProjectOpportunitySchema>;
export type DaoProjectOpportunity = typeof daoProjectOpportunities.$inferSelect;

// Role Interest/Bids - Members expressing interest in project roles
export const roleBidStatuses = ["pending", "accepted", "rejected", "withdrawn"] as const;
export type RoleBidStatus = typeof roleBidStatuses[number];

export const daoRoleBids = pgTable("dao_role_bids", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").notNull().references(() => daoProjectOpportunities.id, { onDelete: "cascade" }),
  membershipId: integer("membership_id").notNull().references(() => daoMemberships.id, { onDelete: "cascade" }),
  preferredRole: varchar("preferred_role", { length: 20 }).$type<AttributionRoleSlot>().notNull(),
  alternateRole: varchar("alternate_role", { length: 20 }).$type<AttributionRoleSlot>(),
  motivation: text("motivation"), // Why they want this role
  relevantExperience: text("relevant_experience"), // Past related work
  availableHoursPerWeek: integer("available_hours_per_week"),
  status: varchar("status", { length: 20 }).$type<RoleBidStatus>().default("pending"),
  reviewedBy: integer("reviewed_by").references(() => daoMemberships.id),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDaoRoleBidSchema = createInsertSchema(daoRoleBids).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDaoRoleBid = z.infer<typeof insertDaoRoleBidSchema>;
export type DaoRoleBid = typeof daoRoleBids.$inferSelect;

// Inbound Deals & IP Tracking - Credit for business development
export const dealSources = ["inbound", "referral", "outbound", "ip_contribution", "partnership"] as const;
export type DealSource = typeof dealSources[number];

export const dealStatuses = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;
export type DealStatus = typeof dealStatuses[number];

export const daoInboundDeals = pgTable("dao_inbound_deals", {
  id: serial("id").primaryKey(),
  broughtByMembershipId: integer("brought_by_membership_id").notNull().references(() => daoMemberships.id),
  referredByMembershipId: integer("referred_by_membership_id").references(() => daoMemberships.id), // If referral
  source: varchar("source", { length: 30 }).$type<DealSource>().notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientProfileId: integer("client_profile_id").references(() => clientProfiles.id, { onDelete: "set null" }),
  description: text("description"),
  estimatedValue: integer("estimated_value"), // In cents
  status: varchar("status", { length: 30 }).$type<DealStatus>().default("lead"),
  projectId: integer("project_id").references(() => daoProjects.id, { onDelete: "set null" }), // If converted to project
  convertedToProjectAt: timestamp("converted_to_project_at"),
  bizDevCreditPercent: integer("biz_dev_credit_percent").default(5), // Default 5% to person who brought it
  referralCreditPercent: integer("referral_credit_percent").default(5), // If referred
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDaoInboundDealSchema = createInsertSchema(daoInboundDeals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDaoInboundDeal = z.infer<typeof insertDaoInboundDealSchema>;
export type DaoInboundDeal = typeof daoInboundDeals.$inferSelect;

// IP Contributions - Track IP assets brought by members
export const ipTypes = ["design", "code", "content", "brand", "game", "platform", "other"] as const;
export type IpType = typeof ipTypes[number];

export const daoIpContributions = pgTable("dao_ip_contributions", {
  id: serial("id").primaryKey(),
  contributorMembershipId: integer("contributor_membership_id").notNull().references(() => daoMemberships.id),
  ipType: varchar("ip_type", { length: 30 }).$type<IpType>().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  estimatedValue: integer("estimated_value"), // In cents
  revenueSharePercent: real("revenue_share_percent").default(0), // If IP generates ongoing revenue
  isActive: boolean("is_active").default(true),
  usedInProjectIds: text("used_in_project_ids"), // JSON array of project IDs using this IP
  documentUrl: text("document_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDaoIpContributionSchema = createInsertSchema(daoIpContributions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDaoIpContribution = z.infer<typeof insertDaoIpContributionSchema>;
export type DaoIpContribution = typeof daoIpContributions.$inferSelect;

// Role Assignment History - Track who was assigned to what for fairness analysis
export const daoRoleAssignmentHistory = pgTable("dao_role_assignment_history", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => daoProjects.id, { onDelete: "cascade" }),
  membershipId: integer("membership_id").notNull().references(() => daoMemberships.id, { onDelete: "cascade" }),
  roleSlot: varchar("role_slot", { length: 20 }).$type<AttributionRoleSlot>().notNull(),
  assignmentMethod: varchar("assignment_method", { length: 30 }), // "council_decision", "algorithm", "volunteer", "rotation"
  skillMatchScore: real("skill_match_score"), // Algorithm's match score
  workloadScore: real("workload_score"), // Lower is better (less busy)
  consistencyScore: real("consistency_score"), // Reliability score at time of assignment
  rankAtAssignment: integer("rank_at_assignment"), // Member's rank tier when assigned
  wasPreferred: boolean("was_preferred").default(false), // Did they request this role?
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const insertDaoRoleAssignmentHistorySchema = createInsertSchema(daoRoleAssignmentHistory).omit({ id: true, assignedAt: true });
export type InsertDaoRoleAssignmentHistory = z.infer<typeof insertDaoRoleAssignmentHistorySchema>;
export type DaoRoleAssignmentHistory = typeof daoRoleAssignmentHistory.$inferSelect;

// Media to MP3 Conversion - Track conversion jobs for web3 users
export const mediaConversionStatuses = ["pending", "processing", "completed", "failed"] as const;
export type MediaConversionStatus = typeof mediaConversionStatuses[number];

export const mediaPlatforms = ["youtube", "soundcloud", "direct"] as const;
export type MediaPlatform = typeof mediaPlatforms[number];

export const mediaConversions = pgTable("media_conversions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceUrl: text("source_url").notNull(),
  platform: varchar("platform", { length: 30 }).$type<MediaPlatform>().notNull(),
  title: varchar("title", { length: 500 }),
  duration: integer("duration"), // Duration in seconds
  status: varchar("status", { length: 30 }).$type<MediaConversionStatus>().default("pending"),
  outputPath: text("output_path"),
  fileSize: integer("file_size"), // File size in bytes
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertMediaConversionSchema = createInsertSchema(mediaConversions).omit({ id: true, createdAt: true, completedAt: true });
export type InsertMediaConversion = z.infer<typeof insertMediaConversionSchema>;
export type MediaConversion = typeof mediaConversions.$inferSelect;

// ================== TEAM BOARDS & ENHANCED TASKS ==================

// Board visibility options
export const boardVisibilityOptions = ["private", "web3", "content", "all_team"] as const;
export type BoardVisibility = typeof boardVisibilityOptions[number];

// Enhanced task statuses for team tasks
export const teamTaskStatuses = ["todo", "in_progress", "done"] as const;
export type TeamTaskStatus = typeof teamTaskStatuses[number];

// Team Boards - Groups of tasks with visibility settings
export const teamBoards = pgTable("team_boards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  visibility: varchar("visibility", { length: 30 }).$type<BoardVisibility>().default("private"),
  color: varchar("color", { length: 7 }), // Hex color for UI
  icon: varchar("icon", { length: 50 }), // Lucide icon name
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTeamBoardSchema = createInsertSchema(teamBoards).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTeamBoard = z.infer<typeof insertTeamBoardSchema>;
export type TeamBoard = typeof teamBoards.$inferSelect;

// Board Memberships - Who can access each board (beyond visibility rules)
export const boardMemberships = pgTable("board_memberships", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").notNull().references(() => teamBoards.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  canEdit: boolean("can_edit").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBoardMembershipSchema = createInsertSchema(boardMemberships).omit({ id: true, createdAt: true });
export type InsertBoardMembership = z.infer<typeof insertBoardMembershipSchema>;
export type BoardMembership = typeof boardMemberships.$inferSelect;

// Team Tasks - Enhanced tasks within boards (uses existing TaskPriority type)
export const teamTasks = pgTable("team_tasks", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").notNull().references(() => teamBoards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"), // Rich text / markdown
  status: varchar("status", { length: 30 }).$type<TeamTaskStatus>().default("todo"),
  priority: varchar("priority", { length: 20 }).$type<TaskPriority>().default("normal"),
  dueDate: timestamp("due_date"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  assigneeId: varchar("assignee_id").references(() => users.id, { onDelete: "set null" }),
  tags: text("tags").array(), // Array of tag strings
  subtasks: jsonb("subtasks").$type<{ id: string; title: string; completed: boolean }[]>().default([]),
  orderIndex: integer("order_index").default(0),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTeamTaskSchema = createInsertSchema(teamTasks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTeamTask = z.infer<typeof insertTeamTaskSchema>;
export type TeamTask = typeof teamTasks.$inferSelect;

// Team Task Comments - Discussion on team tasks
export const teamTaskComments = pgTable("team_task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => teamTasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTeamTaskCommentSchema = createInsertSchema(teamTaskComments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTeamTaskComment = z.infer<typeof insertTeamTaskCommentSchema>;
export type TeamTaskComment = typeof teamTaskComments.$inferSelect;

// Team Task Activity Log - Track changes to team tasks
export const teamTaskActivityTypes = ["created", "status_changed", "assigned", "priority_changed", "due_date_changed", "commented", "subtask_completed", "edited"] as const;
export type TeamTaskActivityType = typeof teamTaskActivityTypes[number];

export const teamTaskActivity = pgTable("team_task_activity", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => teamTasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  activityType: varchar("activity_type", { length: 30 }).$type<TeamTaskActivityType>().notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamTaskActivitySchema = createInsertSchema(teamTaskActivity).omit({ id: true, createdAt: true });
export type InsertTeamTaskActivity = z.infer<typeof insertTeamTaskActivitySchema>;
export type TeamTaskActivity = typeof teamTaskActivity.$inferSelect;

// ================== SAFE TRANSACTION HISTORY ==================

// Transaction types for categorization
export const safeTxTypes = ["transfer", "contract_interaction", "module_transaction", "rejection", "settings_change"] as const;
export type SafeTxType = typeof safeTxTypes[number];

// Full transaction history for Safe wallets (includes executed and pending)
export const daoSafeTxHistory = pgTable("dao_safe_tx_history", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull().references(() => daoSafeWallets.id, { onDelete: "cascade" }),
  safeTxHash: varchar("safe_tx_hash", { length: 66 }).notNull().unique(),
  txHash: varchar("tx_hash", { length: 66 }), // On-chain tx hash (null if not executed)
  chainId: integer("chain_id").notNull(),
  safeAddress: varchar("safe_address", { length: 42 }).notNull(),
  to: varchar("to", { length: 42 }).notNull(),
  value: varchar("value", { length: 78 }).default("0"), // Wei value as string
  data: text("data"), // Calldata
  dataDecoded: text("data_decoded"), // JSON decoded method call
  operation: integer("operation").default(0), // 0 = CALL, 1 = DELEGATECALL
  nonce: integer("nonce").notNull(),
  txType: varchar("tx_type", { length: 30 }).$type<SafeTxType>().default("transfer"),
  // Status tracking
  status: varchar("status", { length: 30 }).$type<SafeTxStatus>().default("awaiting_confirmations"),
  confirmationsRequired: integer("confirmations_required").notNull(),
  confirmationsCount: integer("confirmations_count").default(0),
  // Signatures/confirmations stored as JSON
  confirmations: jsonb("confirmations").$type<{
    signer: string;
    signature: string;
    signatureType?: string;
    submittedAt?: string;
    platformUserId?: string;
  }[]>().default([]),
  // User attribution - who initiated/executed (links to platform users)
  proposerAddress: varchar("proposer_address", { length: 42 }),
  proposerUserId: varchar("proposer_user_id").references(() => users.id, { onDelete: "set null" }),
  executorAddress: varchar("executor_address", { length: 42 }),
  executorUserId: varchar("executor_user_id").references(() => users.id, { onDelete: "set null" }),
  // Token/value metadata for UI display
  tokenSymbol: varchar("token_symbol", { length: 20 }),
  tokenDecimals: integer("token_decimals"),
  formattedValue: varchar("formatted_value", { length: 100 }), // Human-readable value
  // Timestamps
  submittedAt: timestamp("submitted_at"),
  executedAt: timestamp("executed_at"),
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDaoSafeTxHistorySchema = createInsertSchema(daoSafeTxHistory).omit({ id: true, createdAt: true, lastSyncedAt: true });
export type InsertDaoSafeTxHistory = z.infer<typeof insertDaoSafeTxHistorySchema>;
export type DaoSafeTxHistory = typeof daoSafeTxHistory.$inferSelect;

// Signer to User Mapping - Link Safe wallet owners to platform users
export const daoSafeSigners = pgTable("dao_safe_signers", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull().references(() => daoSafeWallets.id, { onDelete: "cascade" }),
  signerAddress: varchar("signer_address", { length: 42 }).notNull(),
  platformUserId: varchar("platform_user_id").references(() => users.id, { onDelete: "set null" }),
  label: varchar("label", { length: 100 }), // Optional display name
  isActive: boolean("is_active").default(true), // Still an owner on the Safe
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDaoSafeSignerSchema = createInsertSchema(daoSafeSigners).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDaoSafeSigner = z.infer<typeof insertDaoSafeSignerSchema>;
export type DaoSafeSigner = typeof daoSafeSigners.$inferSelect;

// ================== CLICKUP-INSPIRED TASK ENHANCEMENTS ==================

// Task Types - different kinds of work items (ClickUp-style)
export const taskTypes = ["task", "milestone", "bug", "feature", "story", "epic", "doc", "whiteboard"] as const;
export type TaskType = typeof taskTypes[number];

// Dependency types between tasks
export const dependencyTypes = ["blocks", "blocked_by", "relates_to", "duplicates", "parent_of", "child_of"] as const;
export type DependencyType = typeof dependencyTypes[number];

// Task Dependencies - relationships between tasks
export const taskDependencies = pgTable("task_dependencies", {
  id: serial("id").primaryKey(),
  taskType: varchar("task_type", { length: 20 }).notNull().default("content"), // "content" or "team" (source task type)
  sourceTaskId: integer("source_task_id").notNull(), // The task that has the dependency
  targetTaskType: varchar("target_task_type", { length: 20 }).notNull().default("content"), // "content" or "team" (target task type)
  targetTaskId: integer("target_task_id").notNull(), // The related task
  dependencyType: varchar("dependency_type", { length: 20 }).$type<DependencyType>().notNull().default("blocks"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskDependencySchema = createInsertSchema(taskDependencies).omit({ id: true, createdAt: true });
export type InsertTaskDependency = z.infer<typeof insertTaskDependencySchema>;
export type TaskDependency = typeof taskDependencies.$inferSelect;

// Enhanced Subtasks - subtasks with full task capabilities (ClickUp-style)
export const enhancedSubtasks = pgTable("enhanced_subtasks", {
  id: serial("id").primaryKey(),
  parentTaskType: varchar("parent_task_type", { length: 20 }).notNull().default("content"), // "content" or "team"
  parentTaskId: integer("parent_task_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).default("todo"), // todo, in_progress, done
  priority: varchar("priority", { length: 20 }).$type<TaskPriority>().default("normal"),
  assigneeId: varchar("assignee_id").references(() => users.id, { onDelete: "set null" }),
  dueDate: timestamp("due_date"),
  estimatedMinutes: integer("estimated_minutes"),
  actualMinutes: integer("actual_minutes").default(0),
  order: integer("order").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id, { onDelete: "set null" }),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEnhancedSubtaskSchema = createInsertSchema(enhancedSubtasks).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export type InsertEnhancedSubtask = z.infer<typeof insertEnhancedSubtaskSchema>;
export type EnhancedSubtask = typeof enhancedSubtasks.$inferSelect;

// Task Docs - rich documents attached to tasks (ClickUp Docs-style)
export const taskDocs = pgTable("task_docs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"), // Rich text / markdown content
  taskType: varchar("task_type", { length: 20 }), // "content" or "team" - null for standalone docs
  taskId: integer("task_id"), // Associated task ID - null for standalone docs
  projectId: integer("project_id").references(() => daoProjects.id, { onDelete: "set null" }),
  clientProfileId: integer("client_profile_id").references(() => clientProfiles.id, { onDelete: "set null" }),
  whiteboardId: integer("whiteboard_id").references(() => whiteboards.id, { onDelete: "set null" }),
  docType: varchar("doc_type", { length: 30 }).default("note"), // note, spec, meeting_notes, requirements, wiki
  coverImage: text("cover_image"), // URL or base64 for doc cover
  icon: varchar("icon", { length: 50 }), // Emoji or icon name
  isTemplate: boolean("is_template").default(false),
  isPublic: boolean("is_public").default(false),
  viewCount: integer("view_count").default(0),
  parentDocId: integer("parent_doc_id"), // For nested docs
  order: integer("order").default(0),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastEditedBy: varchar("last_edited_by").references(() => users.id, { onDelete: "set null" }),
  lastEditedAt: timestamp("last_edited_at"),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskDocSchema = createInsertSchema(taskDocs).omit({ id: true, createdAt: true, updatedAt: true, lastEditedAt: true });
export type InsertTaskDoc = z.infer<typeof insertTaskDocSchema>;
export type TaskDoc = typeof taskDocs.$inferSelect;

// Task Doc Comments - comments on docs
export const taskDocComments = pgTable("task_doc_comments", {
  id: serial("id").primaryKey(),
  docId: integer("doc_id").notNull().references(() => taskDocs.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentCommentId: integer("parent_comment_id"), // For threaded comments
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: varchar("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskDocCommentSchema = createInsertSchema(taskDocComments).omit({ id: true, createdAt: true, updatedAt: true, resolvedAt: true });
export type InsertTaskDocComment = z.infer<typeof insertTaskDocCommentSchema>;
export type TaskDocComment = typeof taskDocComments.$inferSelect;

// Per-Client Uploads - files uploaded directly to client profiles
export const clientUploads = pgTable("client_uploads", {
  id: serial("id").primaryKey(),
  clientProfileId: integer("client_profile_id").notNull().references(() => clientProfiles.id, { onDelete: "cascade" }),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"), // Size in bytes
  mimeType: varchar("mime_type", { length: 100 }),
  category: varchar("category", { length: 50 }).default("general"), // general, contract, asset, reference, deliverable
  description: text("description"),
  tags: text("tags").array(),
  linkedTaskId: integer("linked_task_id").references(() => contentTasks.id, { onDelete: "set null" }),
  linkedDocId: integer("linked_doc_id").references(() => taskDocs.id, { onDelete: "set null" }),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientUploadSchema = createInsertSchema(clientUploads).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClientUpload = z.infer<typeof insertClientUploadSchema>;
export type ClientUpload = typeof clientUploads.$inferSelect;

// Kanban Board Configuration - per-board settings for enhanced Kanban
export const kanbanConfigs = pgTable("kanban_configs", {
  id: serial("id").primaryKey(),
  boardType: varchar("board_type", { length: 20 }).notNull().default("content"), // "content", "team", or custom board ID
  boardId: integer("board_id"), // For team boards, references teamBoards.id
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Personal config if set
  // Column settings
  columns: jsonb("columns").$type<{
    id: string;
    name: string;
    wipLimit?: number;
    color?: string;
    collapsed?: boolean;
    order: number;
  }[]>().default([]),
  // Swimlane configuration
  swimlaneEnabled: boolean("swimlane_enabled").default(false),
  swimlaneGroupBy: varchar("swimlane_group_by", { length: 30 }), // "assignee", "client", "priority", "type", "campaign"
  swimlaneCollapsed: jsonb("swimlane_collapsed").$type<string[]>().default([]), // IDs of collapsed swimlanes
  // Card display settings
  showSubtasks: boolean("show_subtasks").default(true),
  showDueDate: boolean("show_due_date").default(true),
  showAssignee: boolean("show_assignee").default(true),
  showPriority: boolean("show_priority").default(true),
  showTimeTracking: boolean("show_time_tracking").default(false),
  showWatchers: boolean("show_watchers").default(false),
  showDependencies: boolean("show_dependencies").default(true),
  showProgress: boolean("show_progress").default(true),
  cardSize: varchar("card_size", { length: 20 }).default("medium"), // compact, medium, large
  // Filters
  savedFilters: jsonb("saved_filters").$type<{
    id: string;
    name: string;
    filters: Record<string, any>;
    isDefault?: boolean;
  }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKanbanConfigSchema = createInsertSchema(kanbanConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKanbanConfig = z.infer<typeof insertKanbanConfigSchema>;
export type KanbanConfig = typeof kanbanConfigs.$inferSelect;

// Task Custom Fields - dynamic fields for tasks (ClickUp-style)
export const customFieldTypes = ["text", "number", "dropdown", "date", "checkbox", "url", "email", "phone", "currency", "rating", "labels", "people"] as const;
export type CustomFieldType = typeof customFieldTypes[number];

export const taskCustomFields = pgTable("task_custom_fields", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  fieldType: varchar("field_type", { length: 20 }).$type<CustomFieldType>().notNull(),
  description: text("description"),
  options: jsonb("options"), // For dropdown/labels: [{id, label, color}]
  isRequired: boolean("is_required").default(false),
  showInCard: boolean("show_in_card").default(false), // Show on Kanban card
  showInList: boolean("show_in_list").default(true), // Show in list view
  defaultValue: text("default_value"),
  // Scope - which tasks this field applies to
  scope: varchar("scope", { length: 20 }).default("all"), // "all", "content", "team", "client"
  clientProfileId: integer("client_profile_id").references(() => clientProfiles.id, { onDelete: "cascade" }), // If client-specific
  boardId: integer("board_id").references(() => teamBoards.id, { onDelete: "cascade" }), // If board-specific
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }), // If campaign-specific
  order: integer("order").default(0),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskCustomFieldSchema = createInsertSchema(taskCustomFields).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaskCustomField = z.infer<typeof insertTaskCustomFieldSchema>;
export type TaskCustomField = typeof taskCustomFields.$inferSelect;

// Task Custom Field Values - values for custom fields on specific tasks
export const taskCustomFieldValues = pgTable("task_custom_field_values", {
  id: serial("id").primaryKey(),
  customFieldId: integer("custom_field_id").notNull().references(() => taskCustomFields.id, { onDelete: "cascade" }),
  taskType: varchar("task_type", { length: 20 }).notNull().default("content"), // "content" or "team"
  taskId: integer("task_id").notNull(),
  value: text("value"), // Stored as string, parsed based on field type
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskCustomFieldValueSchema = createInsertSchema(taskCustomFieldValues).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaskCustomFieldValue = z.infer<typeof insertTaskCustomFieldValueSchema>;
export type TaskCustomFieldValue = typeof taskCustomFieldValues.$inferSelect;

// Watcher Auto-Add Rules - when to automatically add watchers
export const watcherAutoAddTriggers = ["create", "comment", "edit", "assign", "mention"] as const;
export type WatcherAutoAddTrigger = typeof watcherAutoAddTriggers[number];

export const watcherAutoAddRules = pgTable("watcher_auto_add_rules", {
  id: serial("id").primaryKey(),
  trigger: varchar("trigger", { length: 20 }).$type<WatcherAutoAddTrigger>().notNull(),
  isEnabled: boolean("is_enabled").default(true),
  scope: varchar("scope", { length: 20 }).default("all"), // "all", "content", "team"
  boardId: integer("board_id").references(() => teamBoards.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWatcherAutoAddRuleSchema = createInsertSchema(watcherAutoAddRules).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWatcherAutoAddRule = z.infer<typeof insertWatcherAutoAddRuleSchema>;
export type WatcherAutoAddRule = typeof watcherAutoAddRules.$inferSelect;

// ============================================================
// 3D Model Generation (Admin-only Blender Pipeline)
// ============================================================

export const modelGenerationStatuses = ["pending", "generating_code", "running_blender", "exporting", "completed", "failed"] as const;
export type ModelGenerationStatus = typeof modelGenerationStatuses[number];

export const modelExportFormats = ["glb", "fbx", "blend", "obj", "stl"] as const;
export type ModelExportFormat = typeof modelExportFormats[number];

export const modelGenerationJobs = pgTable("model_generation_jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  exportFormat: varchar("export_format", { length: 20 }).$type<ModelExportFormat>().notNull().default("glb"),
  status: varchar("status", { length: 30 }).$type<ModelGenerationStatus>().notNull().default("pending"),
  generatedCode: text("generated_code"), // The Blender Python script
  outputFilePath: varchar("output_file_path", { length: 500 }), // Path to exported file
  outputFileName: varchar("output_file_name", { length: 255 }), // Original filename for download
  fileSize: integer("file_size"), // Size in bytes
  errorMessage: text("error_message"), // Error details if failed
  blenderLogs: text("blender_logs"), // Stdout/stderr from Blender
  processingTimeMs: integer("processing_time_ms"), // How long it took
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertModelGenerationJobSchema = createInsertSchema(modelGenerationJobs).omit({ 
  id: true, 
  createdAt: true, 
  completedAt: true,
  generatedCode: true,
  outputFilePath: true,
  outputFileName: true,
  fileSize: true,
  errorMessage: true,
  blenderLogs: true,
  processingTimeMs: true,
});
export type InsertModelGenerationJob = z.infer<typeof insertModelGenerationJobSchema>;
export type ModelGenerationJob = typeof modelGenerationJobs.$inferSelect;
