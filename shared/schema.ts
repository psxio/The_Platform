import { z } from "zod";
import { pgTable, text, serial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

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

// Database schema for comparison history
export const comparisons = pgTable("comparisons", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  mintedFileName: text("minted_file_name").notNull(),
  eligibleFileName: text("eligible_file_name").notNull(),
  totalEligible: integer("total_eligible").notNull(),
  totalMinted: integer("total_minted").notNull(),
  remaining: integer("remaining").notNull(),
  invalidAddresses: integer("invalid_addresses"),
  results: jsonb("results").notNull(), // Full ComparisonResult as JSON
});

export const insertComparisonSchema = createInsertSchema(comparisons).omit({
  id: true,
  createdAt: true,
});

export type Comparison = typeof comparisons.$inferSelect;
export type InsertComparison = z.infer<typeof insertComparisonSchema>;
