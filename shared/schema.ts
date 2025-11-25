import { z } from "zod";
import { sql } from "drizzle-orm";
import { pgTable, text, serial, timestamp, jsonb, integer, varchar, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
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

// Database schema for tasks (to-do items)
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("pending"), // pending, in_progress, done
  isPublic: boolean("is_public").notNull().default(false), // if true, anyone can see this task
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// Legacy type alias for compatibility
export type PortalTask = Task;
export type InsertPortalTask = InsertTask;
export const portalTasks = tasks;
