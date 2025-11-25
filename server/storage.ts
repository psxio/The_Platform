import { 
  type Comparison, type InsertComparison, comparisons,
  type Collection, type InsertCollection, collections,
  type MintedAddress, type InsertMintedAddress, mintedAddresses,
  type PortalTask, type InsertPortalTask, portalTasks
} from "@shared/schema";
import { db } from "./db";
import { desc, eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // Comparison history methods
  createComparison(comparison: InsertComparison): Promise<Comparison>;
  getComparisons(limit?: number): Promise<Comparison[]>;
  getComparison(id: number): Promise<Comparison | undefined>;
  
  // Collection methods
  createCollection(collection: InsertCollection): Promise<Collection>;
  getCollections(): Promise<Collection[]>;
  getCollection(id: number): Promise<Collection | undefined>;
  deleteCollection(id: number): Promise<void>;
  
  // Minted address methods
  addMintedAddresses(collectionId: number, addresses: string[]): Promise<number>;
  getMintedAddresses(collectionId: number): Promise<string[]>;
  getMintedAddressCount(collectionId: number): Promise<number>;
  removeMintedAddress(collectionId: number, address: string): Promise<void>;
  
  // Portal task methods
  createPortalTask(task: InsertPortalTask): Promise<PortalTask>;
  getPortalTasks(): Promise<PortalTask[]>;
  updatePortalTaskStatus(id: number, status: string): Promise<PortalTask | undefined>;
  deletePortalTask(id: number): Promise<void>;
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

  // Collection methods
  async createCollection(insertCollection: InsertCollection): Promise<Collection> {
    const [collection] = await db
      .insert(collections)
      .values(insertCollection)
      .returning();
    return collection;
  }

  async getCollections(): Promise<Collection[]> {
    return db
      .select()
      .from(collections)
      .orderBy(desc(collections.createdAt));
  }

  async getCollection(id: number): Promise<Collection | undefined> {
    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, id));
    return collection;
  }

  async deleteCollection(id: number): Promise<void> {
    await db.delete(collections).where(eq(collections.id, id));
  }

  // Minted address methods
  async addMintedAddresses(collectionId: number, addresses: string[]): Promise<number> {
    if (addresses.length === 0) return 0;
    
    // Normalize addresses to lowercase for consistency
    const normalizedAddresses = addresses.map(a => a.toLowerCase());
    
    // Get existing addresses for this collection to avoid duplicates
    const existing = await db
      .select({ address: mintedAddresses.address })
      .from(mintedAddresses)
      .where(eq(mintedAddresses.collectionId, collectionId));
    
    const existingSet = new Set(existing.map(e => e.address.toLowerCase()));
    
    // Filter out duplicates
    const newAddresses = normalizedAddresses.filter(a => !existingSet.has(a));
    
    if (newAddresses.length === 0) return 0;
    
    // Insert new addresses
    await db.insert(mintedAddresses).values(
      newAddresses.map(address => ({
        collectionId,
        address,
      }))
    );
    
    return newAddresses.length;
  }

  async getMintedAddresses(collectionId: number): Promise<string[]> {
    const results = await db
      .select({ address: mintedAddresses.address })
      .from(mintedAddresses)
      .where(eq(mintedAddresses.collectionId, collectionId));
    return results.map(r => r.address);
  }

  async getMintedAddressCount(collectionId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(mintedAddresses)
      .where(eq(mintedAddresses.collectionId, collectionId));
    return Number(result[0]?.count || 0);
  }

  async removeMintedAddress(collectionId: number, address: string): Promise<void> {
    await db
      .delete(mintedAddresses)
      .where(
        and(
          eq(mintedAddresses.collectionId, collectionId),
          eq(mintedAddresses.address, address.toLowerCase())
        )
      );
  }

  // Portal task methods
  async createPortalTask(insertTask: InsertPortalTask): Promise<PortalTask> {
    const [task] = await db
      .insert(portalTasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async getPortalTasks(): Promise<PortalTask[]> {
    return db
      .select()
      .from(portalTasks)
      .orderBy(desc(portalTasks.createdAt));
  }

  async updatePortalTaskStatus(id: number, status: string): Promise<PortalTask | undefined> {
    const [task] = await db
      .update(portalTasks)
      .set({ status })
      .where(eq(portalTasks.id, id))
      .returning();
    return task;
  }

  async deletePortalTask(id: number): Promise<void> {
    await db.delete(portalTasks).where(eq(portalTasks.id, id));
  }
}

export const storage = new DbStorage();
