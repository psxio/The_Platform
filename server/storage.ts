import { type Comparison, type InsertComparison, comparisons } from "@shared/schema";
import { db } from "./db";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  // Comparison history methods
  createComparison(comparison: InsertComparison): Promise<Comparison>;
  getComparisons(limit?: number): Promise<Comparison[]>;
  getComparison(id: number): Promise<Comparison | undefined>;
}

export class DbStorage implements IStorage {
  async createComparison(insertComparison: InsertComparison): Promise<Comparison> {
    const [comparison] = await db
      .insert(comparisons)
      .values(insertComparison)
      .returning();
    return comparison;
  }

  async getComparisons(limit: number = 50): Promise<Comparison[]> {
    return db
      .select()
      .from(comparisons)
      .orderBy(desc(comparisons.createdAt))
      .limit(limit);
  }

  async getComparison(id: number): Promise<Comparison | undefined> {
    const [comparison] = await db
      .select()
      .from(comparisons)
      .where(eq(comparisons.id, id));
    return comparison;
  }
}

export const storage = new DbStorage();
