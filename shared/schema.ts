import { z } from "zod";
import { sql } from "drizzle-orm";
import { pgTable, text, serial, timestamp, jsonb, integer, varchar, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Session storage table for Google Auth
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

// User storage table for Google Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 50 }).$type<UserRole>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

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
});

export type InsertContentTask = z.infer<typeof insertContentTaskSchema>;
export type ContentTask = typeof contentTasks.$inferSelect;

// Directory members table - content team members
export const directoryMembers = pgTable("directory_members", {
  id: serial("id").primaryKey(),
  person: varchar("person", { length: 255 }).notNull(),
  skill: text("skill"),
  evmAddress: varchar("evm_address", { length: 255 }),
  client: varchar("client", { length: 255 }),
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
