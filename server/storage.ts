import { 
  type Comparison, type InsertComparison, comparisons,
  type Collection, type InsertCollection, collections,
  type MintedAddress, type InsertMintedAddress, mintedAddresses,
  type Task, type InsertTask, tasks,
  type User, type UpsertUser, users,
  type ContentTask, type InsertContentTask, contentTasks,
  type DirectoryMember, type InsertDirectoryMember, directoryMembers,
  type Deliverable, type InsertDeliverable, deliverables,
  type AdminInviteCode, adminInviteCodes,
  type Campaign, type InsertCampaign, campaigns,
  type Subtask, type InsertSubtask, subtasks,
  type Comment, type InsertComment, comments,
  type ActivityLog, type InsertActivityLog, activityLog,
  type Notification, type InsertNotification, notifications,
  type UserRole
} from "@shared/schema";
import { db } from "./db";
import { desc, eq, and, sql, or, isNull } from "drizzle-orm";

export interface IStorage {
  // User methods (required for Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { email: string; password: string; firstName: string; lastName?: string }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: UserRole): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
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
  
  // Task methods (user-specific to-do items)
  createTask(userId: string, title: string): Promise<Task>;
  getUserTasks(userId: string): Promise<Task[]>;
  getPublicTasks(): Promise<Task[]>;
  updateTaskStatus(id: number, userId: string, status: string): Promise<Task | undefined>;
  updateTaskPublic(id: number, userId: string, isPublic: boolean): Promise<Task | undefined>;
  deleteTask(id: number, userId: string): Promise<void>;
  getTask(id: number): Promise<Task | undefined>;
  
  // Content task methods (ContentFlowStudio)
  getContentTasks(): Promise<ContentTask[]>;
  getContentTask(id: number): Promise<ContentTask | undefined>;
  createContentTask(task: InsertContentTask): Promise<ContentTask>;
  updateContentTask(id: number, task: Partial<InsertContentTask>): Promise<ContentTask | undefined>;
  deleteContentTask(id: number): Promise<boolean>;
  
  // Directory member methods
  getDirectoryMembers(): Promise<DirectoryMember[]>;
  getDirectoryMember(id: number): Promise<DirectoryMember | undefined>;
  createDirectoryMember(member: InsertDirectoryMember): Promise<DirectoryMember>;
  updateDirectoryMember(id: number, member: Partial<InsertDirectoryMember>): Promise<DirectoryMember | undefined>;
  deleteDirectoryMember(id: number): Promise<boolean>;
  
  // Deliverable methods
  getDeliverables(): Promise<Deliverable[]>;
  getDeliverable(id: number): Promise<Deliverable | undefined>;
  getDeliverablesByTaskId(taskId: number): Promise<Deliverable[]>;
  createDeliverable(deliverable: InsertDeliverable): Promise<Deliverable>;
  deleteDeliverable(id: number): Promise<boolean>;
  
  // Admin invite code methods
  createAdminInviteCode(code: string, createdById: string | null): Promise<AdminInviteCode>;
  getValidAdminInviteCode(code: string): Promise<AdminInviteCode | undefined>;
  useAdminInviteCode(code: string, usedById: string): Promise<AdminInviteCode | undefined>;
  getAdminInviteCodes(createdById?: string): Promise<AdminInviteCode[]>;
  deactivateAdminInviteCode(id: number): Promise<boolean>;
  
  // Campaign methods
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;
  
  // Subtask methods
  getSubtasks(taskId: number): Promise<Subtask[]>;
  createSubtask(subtask: InsertSubtask): Promise<Subtask>;
  updateSubtask(id: number, updates: Partial<InsertSubtask>): Promise<Subtask | undefined>;
  deleteSubtask(id: number): Promise<boolean>;
  
  // Comment methods
  getComments(taskId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: number, content: string): Promise<Comment | undefined>;
  deleteComment(id: number): Promise<boolean>;
  
  // Activity log methods
  getActivityLog(taskId?: number, campaignId?: number, limit?: number): Promise<ActivityLog[]>;
  createActivityLog(activity: InsertActivityLog): Promise<ActivityLog>;
  
  // Notification methods
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number, userId: string): Promise<boolean>;
  markAllNotificationsRead(userId: string): Promise<void>;
}

export class DbStorage implements IStorage {
  // User methods (required for Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: { email: string; password: string; firstName: string; lastName?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName || null,
      })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: UserRole): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

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
    
    const normalizedAddresses = addresses.map(a => a.toLowerCase());
    
    const existing = await db
      .select({ address: mintedAddresses.address })
      .from(mintedAddresses)
      .where(eq(mintedAddresses.collectionId, collectionId));
    
    const existingSet = new Set(existing.map(e => e.address.toLowerCase()));
    const newAddresses = normalizedAddresses.filter(a => !existingSet.has(a));
    
    if (newAddresses.length === 0) return 0;
    
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

  // Task methods (user-specific to-do items)
  async createTask(userId: string, title: string): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({ userId, title, status: "pending", isPublic: false })
      .returning();
    return task;
  }

  async getUserTasks(userId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getPublicTasks(): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.isPublic, true))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async updateTaskStatus(id: number, userId: string, status: string): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ status })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return task;
  }

  async updateTaskPublic(id: number, userId: string, isPublic: boolean): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ isPublic })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return task;
  }

  async deleteTask(id: number, userId: string): Promise<void> {
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  }

  // Content task methods (ContentFlowStudio)
  async getContentTasks(): Promise<ContentTask[]> {
    return await db.select().from(contentTasks).orderBy(desc(contentTasks.createdAt));
  }

  async getContentTask(id: number): Promise<ContentTask | undefined> {
    const [task] = await db.select().from(contentTasks).where(eq(contentTasks.id, id));
    return task;
  }

  async createContentTask(insertTask: InsertContentTask): Promise<ContentTask> {
    const [task] = await db.insert(contentTasks).values(insertTask).returning();
    return task;
  }

  async updateContentTask(id: number, updates: Partial<InsertContentTask>): Promise<ContentTask | undefined> {
    const [task] = await db
      .update(contentTasks)
      .set(updates)
      .where(eq(contentTasks.id, id))
      .returning();
    return task;
  }

  async deleteContentTask(id: number): Promise<boolean> {
    const result = await db.delete(contentTasks).where(eq(contentTasks.id, id)).returning();
    return result.length > 0;
  }

  // Directory member methods
  async getDirectoryMembers(): Promise<DirectoryMember[]> {
    return await db.select().from(directoryMembers);
  }

  async getDirectoryMember(id: number): Promise<DirectoryMember | undefined> {
    const [member] = await db.select().from(directoryMembers).where(eq(directoryMembers.id, id));
    return member;
  }

  async createDirectoryMember(insertMember: InsertDirectoryMember): Promise<DirectoryMember> {
    const [member] = await db.insert(directoryMembers).values(insertMember).returning();
    return member;
  }

  async updateDirectoryMember(id: number, updates: Partial<InsertDirectoryMember>): Promise<DirectoryMember | undefined> {
    const [member] = await db
      .update(directoryMembers)
      .set(updates)
      .where(eq(directoryMembers.id, id))
      .returning();
    return member;
  }

  async deleteDirectoryMember(id: number): Promise<boolean> {
    const result = await db.delete(directoryMembers).where(eq(directoryMembers.id, id)).returning();
    return result.length > 0;
  }

  // Deliverable methods
  async getDeliverables(): Promise<Deliverable[]> {
    return await db.select().from(deliverables).orderBy(desc(deliverables.uploadedAt));
  }

  async getDeliverable(id: number): Promise<Deliverable | undefined> {
    const [deliverable] = await db.select().from(deliverables).where(eq(deliverables.id, id));
    return deliverable;
  }

  async getDeliverablesByTaskId(taskId: number): Promise<Deliverable[]> {
    return await db.select().from(deliverables).where(eq(deliverables.taskId, taskId));
  }

  async createDeliverable(insertDeliverable: InsertDeliverable): Promise<Deliverable> {
    const [deliverable] = await db.insert(deliverables).values(insertDeliverable).returning();
    return deliverable;
  }

  async deleteDeliverable(id: number): Promise<boolean> {
    const result = await db.delete(deliverables).where(eq(deliverables.id, id)).returning();
    return result.length > 0;
  }

  // Admin invite code methods
  async createAdminInviteCode(code: string, createdById: string | null): Promise<AdminInviteCode> {
    const [inviteCode] = await db
      .insert(adminInviteCodes)
      .values({
        code,
        createdBy: createdById,
        isActive: true,
      })
      .returning();
    return inviteCode;
  }

  async getValidAdminInviteCode(code: string): Promise<AdminInviteCode | undefined> {
    const [inviteCode] = await db
      .select()
      .from(adminInviteCodes)
      .where(
        and(
          eq(adminInviteCodes.code, code),
          eq(adminInviteCodes.isActive, true),
          isNull(adminInviteCodes.usedBy)
        )
      );
    return inviteCode;
  }

  async useAdminInviteCode(code: string, usedById: string): Promise<AdminInviteCode | undefined> {
    const [inviteCode] = await db
      .update(adminInviteCodes)
      .set({
        usedBy: usedById,
        usedAt: new Date(),
        isActive: false,
      })
      .where(
        and(
          eq(adminInviteCodes.code, code),
          eq(adminInviteCodes.isActive, true),
          isNull(adminInviteCodes.usedBy)
        )
      )
      .returning();
    return inviteCode;
  }

  async getAdminInviteCodes(createdById?: string): Promise<AdminInviteCode[]> {
    if (createdById) {
      return db
        .select()
        .from(adminInviteCodes)
        .where(eq(adminInviteCodes.createdBy, createdById))
        .orderBy(desc(adminInviteCodes.createdAt));
    }
    return db
      .select()
      .from(adminInviteCodes)
      .orderBy(desc(adminInviteCodes.createdAt));
  }

  async deactivateAdminInviteCode(id: number): Promise<boolean> {
    const result = await db
      .update(adminInviteCodes)
      .set({ isActive: false })
      .where(eq(adminInviteCodes.id, id))
      .returning();
    return result.length > 0;
  }

  // Campaign methods
  async getCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values(insertCampaign).returning();
    return campaign;
  }

  async updateCampaign(id: number, updates: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, id))
      .returning();
    return campaign;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    const result = await db.delete(campaigns).where(eq(campaigns.id, id)).returning();
    return result.length > 0;
  }

  // Subtask methods
  async getSubtasks(taskId: number): Promise<Subtask[]> {
    return await db
      .select()
      .from(subtasks)
      .where(eq(subtasks.taskId, taskId))
      .orderBy(subtasks.order);
  }

  async createSubtask(insertSubtask: InsertSubtask): Promise<Subtask> {
    const [subtask] = await db.insert(subtasks).values(insertSubtask).returning();
    return subtask;
  }

  async updateSubtask(id: number, updates: Partial<InsertSubtask>): Promise<Subtask | undefined> {
    const [subtask] = await db
      .update(subtasks)
      .set(updates)
      .where(eq(subtasks.id, id))
      .returning();
    return subtask;
  }

  async deleteSubtask(id: number): Promise<boolean> {
    const result = await db.delete(subtasks).where(eq(subtasks.id, id)).returning();
    return result.length > 0;
  }

  // Comment methods
  async getComments(taskId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.taskId, taskId))
      .orderBy(comments.createdAt);
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(insertComment).returning();
    return comment;
  }

  async updateComment(id: number, content: string): Promise<Comment | undefined> {
    const [comment] = await db
      .update(comments)
      .set({ content, updatedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return comment;
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id)).returning();
    return result.length > 0;
  }

  // Activity log methods
  async getActivityLog(taskId?: number, campaignId?: number, limit: number = 50): Promise<ActivityLog[]> {
    let query = db.select().from(activityLog);
    
    if (taskId) {
      query = query.where(eq(activityLog.taskId, taskId)) as typeof query;
    } else if (campaignId) {
      query = query.where(eq(activityLog.campaignId, campaignId)) as typeof query;
    }
    
    return await query.orderBy(desc(activityLog.createdAt)).limit(limit);
  }

  async createActivityLog(insertActivity: InsertActivityLog): Promise<ActivityLog> {
    const [activity] = await db.insert(activityLog).values(insertActivity).returning();
    return activity;
  }

  // Notification methods
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return Number(result[0]?.count || 0);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationRead(id: number, userId: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
  }
}

export const storage = new DbStorage();
