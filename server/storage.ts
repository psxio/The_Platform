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
  type AdminInviteCodeUse, type InsertAdminInviteCodeUse, adminInviteCodeUses,
  type Campaign, type InsertCampaign, campaigns,
  type Subtask, type InsertSubtask, subtasks,
  type Comment, type InsertComment, comments,
  type ActivityLog, type InsertActivityLog, activityLog,
  type Notification, type InsertNotification, notifications,
  type UserRole,
  // Enhanced ContentFlowStudio types
  type TaskTemplate, type InsertTaskTemplate, taskTemplates,
  type TemplateSubtask, type InsertTemplateSubtask, templateSubtasks,
  type TaskWatcher, type InsertTaskWatcher, taskWatchers,
  type Approval, type InsertApproval, approvals,
  type TimeEntry, type InsertTimeEntry, timeEntries,
  type Asset, type InsertAsset, assets,
  type DeliverableVersion, type InsertDeliverableVersion, deliverableVersions,
  type SavedFilter, type InsertSavedFilter, savedFilters,
  type RecurringTask, type InsertRecurringTask, recurringTasks,
  type NotificationPreferences, type InsertNotificationPreferences, notificationPreferences,
  // New integration and invite types
  type TeamIntegrationSettings, type InsertTeamIntegrationSettings, teamIntegrationSettings,
  type UserInvite, type InsertUserInvite, userInvites,
  type UserOnboarding, type InsertUserOnboarding, userOnboarding,
  // Pending content approval types
  type PendingContentMember, type InsertPendingContentMember, pendingContentMembers,
  type ContentProfile, type InsertContentProfile, contentProfiles,
  // Worker Monitoring types
  type MonitoringConsent, type InsertMonitoringConsent, monitoringConsent,
  type MonitoringSession, type InsertMonitoringSession, monitoringSessions,
  type MonitoringScreenshot, type InsertMonitoringScreenshot, monitoringScreenshots,
  type MonitoringHourlyReport, type InsertMonitoringHourlyReport, monitoringHourlyReports,
  // Payment Request types
  type PaymentRequest, type InsertPaymentRequest, paymentRequests,
  type PaymentRequestEvent, type InsertPaymentRequestEvent, paymentRequestEvents,
  type PaymentRequestStatus,
  // Brand Pack types
  type ClientBrandPack, type InsertClientBrandPack, clientBrandPacks,
  type BrandPackFile, type InsertBrandPackFile, brandPackFiles,
  // Sheets Hub types
  type ConnectedSheet, type InsertConnectedSheet, connectedSheets,
  type PayrollRecord, type InsertPayrollRecord, payrollRecords,
  type SheetSyncLog, type InsertSheetSyncLog, sheetSyncLogs,
  type MultiColumnTask, type InsertMultiColumnTask, multiColumnTasks,
  // Client Credits types
  type ClientCredit, type InsertClientCredit, clientCredits,
  type CreditTransaction, type InsertCreditTransaction, creditTransactions,
  // Credit Requests types
  type CreditRequest, type InsertCreditRequest, creditRequests,
  // Content Orders types
  type ContentOrder, type InsertContentOrder, contentOrders,
  // Client Onboarding types
  type ClientOnboarding, type InsertClientOnboarding, clientOnboarding,
  // Web3 Onboarding types
  type Web3Onboarding, type InsertWeb3Onboarding, web3Onboarding,
  // Client Work Library types
  type ClientWorkItem, type InsertClientWorkItem, clientWorkItems,
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
  createTask(userId: string, title: string, projectTag?: string, dueDate?: string): Promise<Task>;
  createTasksBulk(userId: string, tasksData: Array<{ title: string; projectTag?: string; dueDate?: string }>): Promise<Task[]>;
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
  
  // Invite code methods (for all roles)
  createInviteCode(code: string, forRole: string, createdById: string | null, maxUses?: number | null, expiresAt?: Date | null): Promise<AdminInviteCode>;
  getValidInviteCode(code: string, forRole: string): Promise<AdminInviteCode | undefined>;
  getValidInviteCodeAnyRole(code: string): Promise<AdminInviteCode | undefined>;
  useInviteCode(code: string, usedById: string, roleGranted: string): Promise<AdminInviteCode | undefined>;
  getInviteCodes(createdById?: string): Promise<AdminInviteCode[]>;
  getInviteCodeUses(codeId: number): Promise<AdminInviteCodeUse[]>;
  getInviteCodesWithUses(createdById?: string): Promise<(AdminInviteCode & { uses: AdminInviteCodeUse[] })[]>;
  deactivateInviteCode(id: number): Promise<boolean>;
  
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
  
  // ==================== ENHANCED CONTENTFLOWSTUDIO METHODS ====================
  
  // Task Template methods
  getTaskTemplates(): Promise<TaskTemplate[]>;
  getTaskTemplate(id: number): Promise<TaskTemplate | undefined>;
  createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate>;
  updateTaskTemplate(id: number, template: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined>;
  deleteTaskTemplate(id: number): Promise<boolean>;
  
  // Template Subtask methods
  getTemplateSubtasks(templateId: number): Promise<TemplateSubtask[]>;
  createTemplateSubtask(subtask: InsertTemplateSubtask): Promise<TemplateSubtask>;
  deleteTemplateSubtask(id: number): Promise<boolean>;
  
  // Task Watcher methods
  getTaskWatchers(taskId: number): Promise<TaskWatcher[]>;
  isWatchingTask(taskId: number, userId: string): Promise<boolean>;
  watchTask(taskId: number, userId: string): Promise<TaskWatcher>;
  unwatchTask(taskId: number, userId: string): Promise<boolean>;
  
  // Approval methods
  getApprovals(taskId: number): Promise<Approval[]>;
  createApproval(approval: InsertApproval): Promise<Approval>;
  updateApprovalStatus(id: number, status: string, comments?: string): Promise<Approval | undefined>;
  
  // Time Entry methods
  getTimeEntries(taskId: number): Promise<TimeEntry[]>;
  getUserTimeEntries(userId: string, startDate?: string, endDate?: string): Promise<TimeEntry[]>;
  getAllTimeEntries(): Promise<TimeEntry[]>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, entry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number): Promise<boolean>;
  
  // Asset methods
  getAssets(category?: string): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<boolean>;
  
  // Deliverable Version methods
  getDeliverableVersions(deliverableId: number): Promise<DeliverableVersion[]>;
  createDeliverableVersion(version: InsertDeliverableVersion): Promise<DeliverableVersion>;
  
  // Saved Filter methods
  getSavedFilters(userId: string): Promise<SavedFilter[]>;
  createSavedFilter(filter: InsertSavedFilter): Promise<SavedFilter>;
  updateSavedFilter(id: number, filter: Partial<InsertSavedFilter>): Promise<SavedFilter | undefined>;
  deleteSavedFilter(id: number): Promise<boolean>;
  
  // Recurring Task methods
  getRecurringTasks(): Promise<RecurringTask[]>;
  getRecurringTask(id: number): Promise<RecurringTask | undefined>;
  createRecurringTask(task: InsertRecurringTask): Promise<RecurringTask>;
  updateRecurringTask(id: number, task: Partial<InsertRecurringTask>): Promise<RecurringTask | undefined>;
  deleteRecurringTask(id: number): Promise<boolean>;
  getDueRecurringTasks(): Promise<RecurringTask[]>;
  
  // Notification Preferences methods
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  upsertNotificationPreferences(prefs: InsertNotificationPreferences): Promise<NotificationPreferences>;
  
  // Team Integration Settings methods
  getTeamIntegrationSettings(): Promise<TeamIntegrationSettings | undefined>;
  upsertTeamIntegrationSettings(settings: InsertTeamIntegrationSettings): Promise<TeamIntegrationSettings>;
  
  // User Invite methods
  getUserInvites(): Promise<UserInvite[]>;
  getUserInvite(id: number): Promise<UserInvite | undefined>;
  getUserInviteByToken(token: string): Promise<UserInvite | undefined>;
  getUserInviteByEmail(email: string): Promise<UserInvite | undefined>;
  createUserInvite(invite: InsertUserInvite & { token: string }): Promise<UserInvite>;
  markInviteUsed(id: number): Promise<boolean>;
  deleteUserInvite(id: number): Promise<boolean>;
  
  // User Onboarding methods
  getUserOnboarding(userId: string): Promise<UserOnboarding | undefined>;
  upsertUserOnboarding(onboarding: InsertUserOnboarding): Promise<UserOnboarding>;
  updateOnboardingStep(userId: string, step: string): Promise<UserOnboarding | undefined>;
  
  // Pending Content Member methods
  getPendingContentMembers(): Promise<PendingContentMember[]>;
  getPendingContentMember(userId: string): Promise<PendingContentMember | undefined>;
  createPendingContentMember(member: InsertPendingContentMember): Promise<PendingContentMember>;
  updatePendingContentMember(userId: string, updates: Partial<InsertPendingContentMember>): Promise<PendingContentMember | undefined>;
  approvePendingContentMember(userId: string, reviewerId: string, reviewNotes?: string): Promise<PendingContentMember | undefined>;
  rejectPendingContentMember(userId: string, reviewerId: string, reviewNotes?: string): Promise<PendingContentMember | undefined>;
  deletePendingContentMember(userId: string): Promise<boolean>;
  
  // Content Profile methods
  getContentProfile(userId: string): Promise<ContentProfile | undefined>;
  createContentProfile(profile: InsertContentProfile): Promise<ContentProfile>;
  updateContentProfile(userId: string, updates: Partial<InsertContentProfile>): Promise<ContentProfile | undefined>;
  isContentProfileComplete(userId: string): Promise<boolean>;
  
  // ==================== WORKER MONITORING METHODS ====================
  
  // Monitoring Consent methods
  getMonitoringConsent(userId: string): Promise<MonitoringConsent | undefined>;
  createMonitoringConsent(consent: InsertMonitoringConsent): Promise<MonitoringConsent>;
  hasValidConsent(userId: string): Promise<boolean>;
  
  // Monitoring Session methods
  getMonitoringSessions(userId?: string): Promise<MonitoringSession[]>;
  getActiveMonitoringSession(userId: string): Promise<MonitoringSession | undefined>;
  getAllActiveMonitoringSessions(): Promise<MonitoringSession[]>;
  getMonitoringSession(id: number): Promise<MonitoringSession | undefined>;
  createMonitoringSession(session: InsertMonitoringSession): Promise<MonitoringSession>;
  updateMonitoringSession(id: number, updates: Partial<InsertMonitoringSession>): Promise<MonitoringSession | undefined>;
  endMonitoringSession(id: number): Promise<MonitoringSession | undefined>;
  
  // Monitoring Screenshot methods
  getMonitoringScreenshots(sessionId: number): Promise<MonitoringScreenshot[]>;
  getMonitoringScreenshotsByHour(userId: string, hourBucket: string): Promise<MonitoringScreenshot[]>;
  getMonitoringScreenshot(id: number): Promise<MonitoringScreenshot | undefined>;
  createMonitoringScreenshot(screenshot: InsertMonitoringScreenshot): Promise<MonitoringScreenshot>;
  
  // Monitoring Hourly Report methods
  getMonitoringHourlyReports(userId?: string): Promise<MonitoringHourlyReport[]>;
  getMonitoringHourlyReport(id: number): Promise<MonitoringHourlyReport | undefined>;
  createMonitoringHourlyReport(report: InsertMonitoringHourlyReport): Promise<MonitoringHourlyReport>;
  getLatestHourlyReport(userId: string): Promise<MonitoringHourlyReport | undefined>;
  
  // ==================== PAYMENT REQUEST METHODS ====================
  
  // Payment Request methods
  getPaymentRequests(userId?: string): Promise<PaymentRequest[]>;
  getPaymentRequest(id: number): Promise<PaymentRequest | undefined>;
  createPaymentRequest(request: InsertPaymentRequest): Promise<PaymentRequest>;
  updatePaymentRequestStatus(id: number, status: PaymentRequestStatus, reviewerId: string, note?: string): Promise<PaymentRequest | undefined>;
  cancelPaymentRequest(id: number, requesterId: string): Promise<PaymentRequest | undefined>;
  getPendingPaymentRequestCount(): Promise<number>;
  
  // Payment Request Event methods
  getPaymentRequestEvents(paymentRequestId: number): Promise<PaymentRequestEvent[]>;
  createPaymentRequestEvent(event: InsertPaymentRequestEvent): Promise<PaymentRequestEvent>;
  
  // ==================== BRAND PACK METHODS ====================
  
  // Client Brand Pack methods
  getClientBrandPacks(activeOnly?: boolean): Promise<ClientBrandPack[]>;
  getClientBrandPack(id: number): Promise<ClientBrandPack | undefined>;
  getClientBrandPackByName(clientName: string): Promise<ClientBrandPack | undefined>;
  createClientBrandPack(brandPack: InsertClientBrandPack): Promise<ClientBrandPack>;
  updateClientBrandPack(id: number, updates: Partial<InsertClientBrandPack>): Promise<ClientBrandPack | undefined>;
  deleteClientBrandPack(id: number): Promise<boolean>;
  
  // Brand Pack File methods
  getBrandPackFiles(brandPackId: number): Promise<BrandPackFile[]>;
  getBrandPackFile(id: number): Promise<BrandPackFile | undefined>;
  createBrandPackFile(file: InsertBrandPackFile): Promise<BrandPackFile>;
  updateBrandPackFile(id: number, updates: Partial<InsertBrandPackFile>): Promise<BrandPackFile | undefined>;
  deleteBrandPackFile(id: number): Promise<boolean>;
  
  // ==================== SHEETS HUB METHODS ====================
  
  // Connected Sheet methods
  getConnectedSheets(): Promise<ConnectedSheet[]>;
  getConnectedSheet(id: number): Promise<ConnectedSheet | undefined>;
  getConnectedSheetBySheetId(sheetId: string): Promise<ConnectedSheet | undefined>;
  createConnectedSheet(sheet: InsertConnectedSheet): Promise<ConnectedSheet>;
  updateConnectedSheet(id: number, updates: Partial<InsertConnectedSheet>): Promise<ConnectedSheet | undefined>;
  updateSheetSyncStatus(id: number, status: string, message?: string): Promise<ConnectedSheet | undefined>;
  deleteConnectedSheet(id: number): Promise<boolean>;
  
  // Payroll Record methods
  getPayrollRecords(sheetId?: number): Promise<PayrollRecord[]>;
  getPayrollRecord(id: number): Promise<PayrollRecord | undefined>;
  createPayrollRecord(record: InsertPayrollRecord): Promise<PayrollRecord>;
  createPayrollRecordsBulk(records: InsertPayrollRecord[]): Promise<PayrollRecord[]>;
  updatePayrollRecord(id: number, updates: Partial<InsertPayrollRecord>): Promise<PayrollRecord | undefined>;
  deletePayrollRecordsBySheet(sheetId: number): Promise<number>;
  getPayrollAggregations(sheetId?: number): Promise<{ entityName: string; totalIn: number; totalOut: number; count: number }[]>;
  
  // Sheet Sync Log methods
  getSheetSyncLogs(sheetId?: number, limit?: number): Promise<SheetSyncLog[]>;
  createSheetSyncLog(log: InsertSheetSyncLog): Promise<SheetSyncLog>;
  updateSheetSyncLog(id: number, updates: Partial<InsertSheetSyncLog>): Promise<SheetSyncLog | undefined>;
  
  // Multi-Column Task methods
  getMultiColumnTasks(sheetId?: number): Promise<MultiColumnTask[]>;
  createMultiColumnTask(task: InsertMultiColumnTask): Promise<MultiColumnTask>;
  createMultiColumnTasksBulk(tasks: InsertMultiColumnTask[]): Promise<MultiColumnTask[]>;
  deleteMultiColumnTasksBySheet(sheetId: number): Promise<number>;
  getMultiColumnTasksByColumn(sheetId: number): Promise<{ columnName: string; tasks: MultiColumnTask[] }[]>;
  
  // ==================== CLIENT CREDITS METHODS ====================
  
  // Client Credit methods
  getClientCredit(userId: string): Promise<ClientCredit | undefined>;
  getClientCredits(): Promise<ClientCredit[]>;
  createClientCredit(credit: InsertClientCredit): Promise<ClientCredit>;
  updateClientCredit(userId: string, updates: Partial<InsertClientCredit>): Promise<ClientCredit | undefined>;
  addClientCredit(userId: string, amount: number, description: string, performedBy: string): Promise<ClientCredit>;
  deductClientCredit(userId: string, amount: number, description: string, taskId?: number, performedBy?: string): Promise<ClientCredit>;
  
  // Credit Transaction methods
  getCreditTransactions(userId: string, limit?: number): Promise<CreditTransaction[]>;
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  
  // ==================== CREDIT REQUESTS METHODS ====================
  
  // Credit Request methods
  getCreditRequests(userId?: string): Promise<CreditRequest[]>;
  getCreditRequest(id: number): Promise<CreditRequest | undefined>;
  createCreditRequest(request: InsertCreditRequest): Promise<CreditRequest>;
  updateCreditRequest(id: number, updates: Partial<CreditRequest>): Promise<CreditRequest | undefined>;
  cancelCreditRequest(id: number, userId: string): Promise<CreditRequest | undefined>;
  approveCreditRequest(id: number, adminId: string, approvedAmount: number, note?: string): Promise<CreditRequest | undefined>;
  rejectCreditRequest(id: number, adminId: string, note?: string): Promise<CreditRequest | undefined>;
  getPendingCreditRequests(): Promise<CreditRequest[]>;
  
  // ==================== CONTENT ORDERS METHODS ====================
  
  // Content Order methods
  getContentOrders(clientId?: string): Promise<ContentOrder[]>;
  getContentOrder(id: number): Promise<ContentOrder | undefined>;
  createContentOrder(order: InsertContentOrder): Promise<ContentOrder>;
  updateContentOrder(id: number, updates: Partial<ContentOrder>): Promise<ContentOrder | undefined>;
  submitContentOrder(id: number, userId: string): Promise<ContentOrder | undefined>;
  assignContentOrder(id: number, assignedTo: string, adminId: string): Promise<ContentOrder | undefined>;
  completeContentOrder(id: number, deliverableUrl: string, adminId: string): Promise<ContentOrder | undefined>;
  cancelContentOrder(id: number, userId: string): Promise<ContentOrder | undefined>;
  getOrdersForTeamMember(assignedTo: string): Promise<ContentOrder[]>;
  
  // ==================== CLIENT ONBOARDING METHODS ====================
  
  // Client Onboarding methods
  getClientOnboarding(userId: string): Promise<ClientOnboarding | undefined>;
  createClientOnboarding(onboarding: InsertClientOnboarding): Promise<ClientOnboarding>;
  updateClientOnboarding(userId: string, updates: Partial<ClientOnboarding>): Promise<ClientOnboarding | undefined>;
  markClientOnboardingStep(userId: string, step: keyof InsertClientOnboarding): Promise<ClientOnboarding | undefined>;
  
  // ==================== CLIENT WORK LIBRARY METHODS ====================
  
  // Client Work Item methods
  getClientWorkItems(brandPackId?: number): Promise<ClientWorkItem[]>;
  getClientWorkItem(id: number): Promise<ClientWorkItem | undefined>;
  getClientWorkItemsByUploader(uploaderId: string): Promise<ClientWorkItem[]>;
  createClientWorkItem(item: InsertClientWorkItem): Promise<ClientWorkItem>;
  updateClientWorkItem(id: number, updates: Partial<InsertClientWorkItem>): Promise<ClientWorkItem | undefined>;
  deleteClientWorkItem(id: number): Promise<boolean>;
  getClientWorkItemsByTask(taskId: number): Promise<ClientWorkItem[]>;
  getClientWorkItemsByCampaign(campaignId: number): Promise<ClientWorkItem[]>;
  getClientWorkStats(): Promise<{ uploaderId: string; brandPackId: number; count: number; latestUpload: Date | null }[]>;
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
  async createTask(userId: string, title: string, projectTag?: string, dueDate?: string): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({ userId, title, projectTag, dueDate, status: "pending", isPublic: false })
      .returning();
    return task;
  }

  async createTasksBulk(userId: string, tasksData: Array<{ title: string; projectTag?: string; dueDate?: string }>): Promise<Task[]> {
    if (tasksData.length === 0) return [];
    
    const values = tasksData.map(t => ({
      userId,
      title: t.title,
      projectTag: t.projectTag,
      dueDate: t.dueDate,
      status: "pending",
      isPublic: false,
    }));
    
    const created = await db.insert(tasks).values(values).returning();
    return created;
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

  async getDirectoryMemberByEmail(email: string): Promise<DirectoryMember | undefined> {
    const [member] = await db.select().from(directoryMembers).where(
      sql`lower(${directoryMembers.email}) = lower(${email})`
    );
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

  // Invite code methods (for all roles)
  async createInviteCode(code: string, forRole: string, createdById: string | null, maxUses?: number | null, expiresAt?: Date | null): Promise<AdminInviteCode> {
    const [inviteCode] = await db
      .insert(adminInviteCodes)
      .values({
        code,
        forRole,
        maxUses: maxUses === undefined ? 1 : maxUses, // null = unlimited, otherwise default to 1
        usedCount: 0,
        createdBy: createdById,
        expiresAt: expiresAt || null,
        isActive: true,
      })
      .returning();
    return inviteCode;
  }

  async getValidInviteCode(code: string, forRole: string): Promise<AdminInviteCode | undefined> {
    // Get the code first
    const [inviteCode] = await db
      .select()
      .from(adminInviteCodes)
      .where(
        and(
          eq(adminInviteCodes.code, code),
          eq(adminInviteCodes.forRole, forRole),
          eq(adminInviteCodes.isActive, true)
        )
      );
    
    if (!inviteCode) return undefined;
    
    // Check if expired
    if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
      return undefined;
    }
    
    // Check if usage limit reached (null maxUses = unlimited)
    if (inviteCode.maxUses !== null && inviteCode.usedCount >= inviteCode.maxUses) {
      return undefined;
    }
    
    return inviteCode;
  }

  async getValidInviteCodeAnyRole(code: string): Promise<AdminInviteCode | undefined> {
    const [inviteCode] = await db
      .select()
      .from(adminInviteCodes)
      .where(
        and(
          eq(adminInviteCodes.code, code),
          eq(adminInviteCodes.isActive, true)
        )
      );
    
    if (!inviteCode) return undefined;
    
    // Check if expired
    if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
      return undefined;
    }
    
    // Check if usage limit reached (null maxUses = unlimited)
    if (inviteCode.maxUses !== null && inviteCode.usedCount >= inviteCode.maxUses) {
      return undefined;
    }
    
    return inviteCode;
  }

  async useInviteCode(code: string, usedById: string, roleGranted: string): Promise<AdminInviteCode | undefined> {
    // First get the code to check its current state
    const existingCode = await this.getValidInviteCodeAnyRole(code);
    if (!existingCode) return undefined;
    
    // Get user details for tracking
    const user = await this.getUser(usedById);
    
    // Increment usage count and update last used info
    const newUsedCount = existingCode.usedCount + 1;
    const shouldDeactivate = existingCode.maxUses !== null && newUsedCount >= existingCode.maxUses;
    
    const [inviteCode] = await db
      .update(adminInviteCodes)
      .set({
        usedBy: usedById,
        usedAt: new Date(),
        usedCount: newUsedCount,
        isActive: !shouldDeactivate, // Only deactivate if usage limit reached
      })
      .where(eq(adminInviteCodes.id, existingCode.id))
      .returning();
    
    // Record the usage details in the new tracking table
    if (inviteCode && user) {
      await db.insert(adminInviteCodeUses).values({
        codeId: existingCode.id,
        userId: usedById,
        userEmail: user.email,
        userFirstName: user.firstName || null,
        userLastName: user.lastName || null,
        roleGranted: roleGranted,
      });
    }
    
    return inviteCode;
  }

  async getInviteCodes(createdById?: string): Promise<AdminInviteCode[]> {
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

  async getInviteCodeUses(codeId: number): Promise<AdminInviteCodeUse[]> {
    return db
      .select()
      .from(adminInviteCodeUses)
      .where(eq(adminInviteCodeUses.codeId, codeId))
      .orderBy(desc(adminInviteCodeUses.usedAt));
  }

  async getInviteCodesWithUses(createdById?: string): Promise<(AdminInviteCode & { uses: AdminInviteCodeUse[] })[]> {
    // Get all invite codes
    const codes = await this.getInviteCodes(createdById);
    
    // For each code, get its usage details
    const codesWithUses = await Promise.all(
      codes.map(async (code) => {
        const uses = await this.getInviteCodeUses(code.id);
        return { ...code, uses };
      })
    );
    
    return codesWithUses;
  }

  async deactivateInviteCode(id: number): Promise<boolean> {
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
  async getActivityLog(taskId?: number, campaignId?: number, limit: number = 50): Promise<(ActivityLog & { user?: { firstName: string | null; lastName: string | null; profileImageUrl: string | null } })[]> {
    const baseQuery = db
      .select({
        id: activityLog.id,
        taskId: activityLog.taskId,
        campaignId: activityLog.campaignId,
        userId: activityLog.userId,
        action: activityLog.action,
        details: activityLog.details,
        createdAt: activityLog.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userProfileImage: users.profileImageUrl,
      })
      .from(activityLog)
      .leftJoin(users, eq(activityLog.userId, users.id));
    
    let results;
    if (taskId) {
      results = await baseQuery
        .where(eq(activityLog.taskId, taskId))
        .orderBy(desc(activityLog.createdAt))
        .limit(limit);
    } else if (campaignId) {
      results = await baseQuery
        .where(eq(activityLog.campaignId, campaignId))
        .orderBy(desc(activityLog.createdAt))
        .limit(limit);
    } else {
      results = await baseQuery
        .orderBy(desc(activityLog.createdAt))
        .limit(limit);
    }
    
    return results.map(row => ({
      id: row.id,
      taskId: row.taskId,
      campaignId: row.campaignId,
      userId: row.userId,
      action: row.action,
      details: row.details,
      createdAt: row.createdAt,
      user: row.userId ? {
        firstName: row.userFirstName,
        lastName: row.userLastName,
        profileImageUrl: row.userProfileImage,
      } : undefined,
    }));
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

  // ==================== ENHANCED CONTENTFLOWSTUDIO IMPLEMENTATIONS ====================

  // Task Template methods
  async getTaskTemplates(): Promise<TaskTemplate[]> {
    return await db.select().from(taskTemplates).orderBy(desc(taskTemplates.createdAt));
  }

  async getTaskTemplate(id: number): Promise<TaskTemplate | undefined> {
    const [template] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id));
    return template;
  }

  async createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate> {
    const [created] = await db.insert(taskTemplates).values(template).returning();
    return created;
  }

  async updateTaskTemplate(id: number, template: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined> {
    const [updated] = await db
      .update(taskTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(taskTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteTaskTemplate(id: number): Promise<boolean> {
    const result = await db.delete(taskTemplates).where(eq(taskTemplates.id, id)).returning();
    return result.length > 0;
  }

  // Template Subtask methods
  async getTemplateSubtasks(templateId: number): Promise<TemplateSubtask[]> {
    return await db
      .select()
      .from(templateSubtasks)
      .where(eq(templateSubtasks.templateId, templateId))
      .orderBy(templateSubtasks.order);
  }

  async createTemplateSubtask(subtask: InsertTemplateSubtask): Promise<TemplateSubtask> {
    const [created] = await db.insert(templateSubtasks).values(subtask).returning();
    return created;
  }

  async deleteTemplateSubtask(id: number): Promise<boolean> {
    const result = await db.delete(templateSubtasks).where(eq(templateSubtasks.id, id)).returning();
    return result.length > 0;
  }

  // Task Watcher methods
  async getTaskWatchers(taskId: number): Promise<TaskWatcher[]> {
    return await db.select().from(taskWatchers).where(eq(taskWatchers.taskId, taskId));
  }

  async isWatchingTask(taskId: number, userId: string): Promise<boolean> {
    const [watcher] = await db
      .select()
      .from(taskWatchers)
      .where(and(eq(taskWatchers.taskId, taskId), eq(taskWatchers.userId, userId)));
    return !!watcher;
  }

  async watchTask(taskId: number, userId: string): Promise<TaskWatcher> {
    const [watcher] = await db
      .insert(taskWatchers)
      .values({ taskId, userId })
      .returning();
    return watcher;
  }

  async unwatchTask(taskId: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(taskWatchers)
      .where(and(eq(taskWatchers.taskId, taskId), eq(taskWatchers.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // Approval methods
  async getApprovals(taskId: number): Promise<Approval[]> {
    return await db.select().from(approvals).where(eq(approvals.taskId, taskId)).orderBy(desc(approvals.createdAt));
  }

  async createApproval(approval: InsertApproval): Promise<Approval> {
    const [created] = await db.insert(approvals).values(approval).returning();
    return created;
  }

  async updateApprovalStatus(id: number, status: string, comments?: string): Promise<Approval | undefined> {
    const [updated] = await db
      .update(approvals)
      .set({ status, comments, reviewedAt: new Date() })
      .where(eq(approvals.id, id))
      .returning();
    return updated;
  }

  // Time Entry methods
  async getTimeEntries(taskId: number): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).where(eq(timeEntries.taskId, taskId)).orderBy(desc(timeEntries.date));
  }

  async getUserTimeEntries(userId: string, startDate?: string, endDate?: string): Promise<TimeEntry[]> {
    let query = db.select().from(timeEntries).where(eq(timeEntries.userId, userId));
    // Note: Date filtering would need proper implementation with date comparisons
    return await query.orderBy(desc(timeEntries.date));
  }

  async getAllTimeEntries(): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).orderBy(desc(timeEntries.date));
  }

  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    const [created] = await db.insert(timeEntries).values(entry).returning();
    return created;
  }

  async updateTimeEntry(id: number, entry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    const [updated] = await db.update(timeEntries).set(entry).where(eq(timeEntries.id, id)).returning();
    return updated;
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    const result = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning();
    return result.length > 0;
  }

  // Asset methods
  async getAssets(category?: string): Promise<Asset[]> {
    if (category) {
      return await db.select().from(assets).where(eq(assets.category, category)).orderBy(desc(assets.createdAt));
    }
    return await db.select().from(assets).orderBy(desc(assets.createdAt));
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset;
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [created] = await db.insert(assets).values(asset).returning();
    return created;
  }

  async updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [updated] = await db.update(assets).set(asset).where(eq(assets.id, id)).returning();
    return updated;
  }

  async deleteAsset(id: number): Promise<boolean> {
    const result = await db.delete(assets).where(eq(assets.id, id)).returning();
    return result.length > 0;
  }

  // Deliverable Version methods
  async getDeliverableVersions(deliverableId: number): Promise<DeliverableVersion[]> {
    return await db
      .select()
      .from(deliverableVersions)
      .where(eq(deliverableVersions.deliverableId, deliverableId))
      .orderBy(desc(deliverableVersions.versionNumber));
  }

  async createDeliverableVersion(version: InsertDeliverableVersion): Promise<DeliverableVersion> {
    const [created] = await db.insert(deliverableVersions).values(version).returning();
    return created;
  }

  // Saved Filter methods
  async getSavedFilters(userId: string): Promise<SavedFilter[]> {
    return await db.select().from(savedFilters).where(eq(savedFilters.userId, userId)).orderBy(savedFilters.name);
  }

  async createSavedFilter(filter: InsertSavedFilter): Promise<SavedFilter> {
    const [created] = await db.insert(savedFilters).values(filter).returning();
    return created;
  }

  async updateSavedFilter(id: number, filter: Partial<InsertSavedFilter>): Promise<SavedFilter | undefined> {
    const [updated] = await db.update(savedFilters).set(filter).where(eq(savedFilters.id, id)).returning();
    return updated;
  }

  async deleteSavedFilter(id: number): Promise<boolean> {
    const result = await db.delete(savedFilters).where(eq(savedFilters.id, id)).returning();
    return result.length > 0;
  }

  // Recurring Task methods
  async getRecurringTasks(): Promise<RecurringTask[]> {
    return await db.select().from(recurringTasks).orderBy(desc(recurringTasks.createdAt));
  }

  async getRecurringTask(id: number): Promise<RecurringTask | undefined> {
    const [task] = await db.select().from(recurringTasks).where(eq(recurringTasks.id, id));
    return task;
  }

  async createRecurringTask(task: InsertRecurringTask): Promise<RecurringTask> {
    const [created] = await db.insert(recurringTasks).values(task).returning();
    return created;
  }

  async updateRecurringTask(id: number, task: Partial<InsertRecurringTask>): Promise<RecurringTask | undefined> {
    const [updated] = await db.update(recurringTasks).set(task).where(eq(recurringTasks.id, id)).returning();
    return updated;
  }

  async deleteRecurringTask(id: number): Promise<boolean> {
    const result = await db.delete(recurringTasks).where(eq(recurringTasks.id, id)).returning();
    return result.length > 0;
  }

  async getDueRecurringTasks(): Promise<RecurringTask[]> {
    return await db
      .select()
      .from(recurringTasks)
      .where(
        and(
          eq(recurringTasks.isActive, true),
          or(
            isNull(recurringTasks.nextGenerationAt),
            sql`${recurringTasks.nextGenerationAt} <= NOW()`
          )
        )
      );
  }

  // Notification Preferences methods
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return prefs;
  }

  async upsertNotificationPreferences(prefs: InsertNotificationPreferences): Promise<NotificationPreferences> {
    const existing = await this.getNotificationPreferences(prefs.userId);
    if (existing) {
      const [updated] = await db
        .update(notificationPreferences)
        .set({ ...prefs, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, prefs.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(notificationPreferences).values(prefs).returning();
      return created;
    }
  }

  // Team Integration Settings methods
  async getTeamIntegrationSettings(): Promise<TeamIntegrationSettings | undefined> {
    const [settings] = await db.select().from(teamIntegrationSettings);
    return settings;
  }

  async upsertTeamIntegrationSettings(settings: InsertTeamIntegrationSettings): Promise<TeamIntegrationSettings> {
    const existing = await this.getTeamIntegrationSettings();
    if (existing) {
      const [updated] = await db
        .update(teamIntegrationSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(teamIntegrationSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(teamIntegrationSettings).values(settings).returning();
      return created;
    }
  }

  // User Invite methods
  async getUserInvites(): Promise<UserInvite[]> {
    return await db.select().from(userInvites).orderBy(desc(userInvites.createdAt));
  }

  async getUserInvite(id: number): Promise<UserInvite | undefined> {
    const [invite] = await db.select().from(userInvites).where(eq(userInvites.id, id));
    return invite;
  }

  async getUserInviteByToken(token: string): Promise<UserInvite | undefined> {
    const [invite] = await db
      .select()
      .from(userInvites)
      .where(
        and(
          eq(userInvites.token, token),
          isNull(userInvites.usedAt),
          sql`${userInvites.expiresAt} > NOW()`
        )
      );
    return invite;
  }

  async getUserInviteByEmail(email: string): Promise<UserInvite | undefined> {
    const [invite] = await db
      .select()
      .from(userInvites)
      .where(
        and(
          eq(userInvites.email, email),
          isNull(userInvites.usedAt),
          sql`${userInvites.expiresAt} > NOW()`
        )
      );
    return invite;
  }

  async createUserInvite(invite: InsertUserInvite & { token: string }): Promise<UserInvite> {
    const [created] = await db.insert(userInvites).values(invite).returning();
    return created;
  }

  async markInviteUsed(id: number): Promise<boolean> {
    const result = await db
      .update(userInvites)
      .set({ usedAt: new Date() })
      .where(eq(userInvites.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteUserInvite(id: number): Promise<boolean> {
    const result = await db.delete(userInvites).where(eq(userInvites.id, id)).returning();
    return result.length > 0;
  }

  // User Onboarding methods
  async getUserOnboarding(userId: string): Promise<UserOnboarding | undefined> {
    const [onboarding] = await db
      .select()
      .from(userOnboarding)
      .where(eq(userOnboarding.userId, userId));
    return onboarding;
  }

  async upsertUserOnboarding(onboardingData: InsertUserOnboarding): Promise<UserOnboarding> {
    const existing = await this.getUserOnboarding(onboardingData.userId);
    if (existing) {
      const [updated] = await db
        .update(userOnboarding)
        .set({ ...onboardingData, updatedAt: new Date() })
        .where(eq(userOnboarding.userId, onboardingData.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userOnboarding).values(onboardingData).returning();
      return created;
    }
  }

  async updateOnboardingStep(userId: string, step: string): Promise<UserOnboarding | undefined> {
    const stepMap: Record<string, any> = {
      hasSeenWelcome: { hasSeenWelcome: true },
      hasCreatedTask: { hasCreatedTask: true },
      hasAddedTeamMember: { hasAddedTeamMember: true },
      hasUploadedDeliverable: { hasUploadedDeliverable: true },
    };
    
    if (!stepMap[step]) return undefined;
    
    const existing = await this.getUserOnboarding(userId);
    if (existing) {
      const [updated] = await db
        .update(userOnboarding)
        .set({ ...stepMap[step], updatedAt: new Date() })
        .where(eq(userOnboarding.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userOnboarding)
        .values({ userId, ...stepMap[step] })
        .returning();
      return created;
    }
  }

  // Pending Content Member methods
  async getPendingContentMembers(): Promise<PendingContentMember[]> {
    return await db
      .select()
      .from(pendingContentMembers)
      .orderBy(desc(pendingContentMembers.createdAt));
  }

  async getPendingContentMember(userId: string): Promise<PendingContentMember | undefined> {
    const [member] = await db
      .select()
      .from(pendingContentMembers)
      .where(eq(pendingContentMembers.userId, userId));
    return member;
  }

  async createPendingContentMember(member: InsertPendingContentMember): Promise<PendingContentMember> {
    const [created] = await db.insert(pendingContentMembers).values(member).returning();
    return created;
  }

  async updatePendingContentMember(userId: string, updates: Partial<InsertPendingContentMember>): Promise<PendingContentMember | undefined> {
    const [updated] = await db
      .update(pendingContentMembers)
      .set(updates)
      .where(eq(pendingContentMembers.userId, userId))
      .returning();
    return updated;
  }

  async approvePendingContentMember(userId: string, reviewerId: string, reviewNotes?: string): Promise<PendingContentMember | undefined> {
    const [updated] = await db
      .update(pendingContentMembers)
      .set({
        status: "approved",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      })
      .where(eq(pendingContentMembers.userId, userId))
      .returning();
    return updated;
  }

  async rejectPendingContentMember(userId: string, reviewerId: string, reviewNotes?: string): Promise<PendingContentMember | undefined> {
    const [updated] = await db
      .update(pendingContentMembers)
      .set({
        status: "rejected",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      })
      .where(eq(pendingContentMembers.userId, userId))
      .returning();
    return updated;
  }

  async deletePendingContentMember(userId: string): Promise<boolean> {
    const result = await db
      .delete(pendingContentMembers)
      .where(eq(pendingContentMembers.userId, userId))
      .returning();
    return result.length > 0;
  }

  // Content Profile methods
  async getContentProfile(userId: string): Promise<ContentProfile | undefined> {
    const [profile] = await db
      .select()
      .from(contentProfiles)
      .where(eq(contentProfiles.userId, userId));
    return profile;
  }

  async createContentProfile(profile: InsertContentProfile): Promise<ContentProfile> {
    const [created] = await db.insert(contentProfiles).values(profile).returning();
    return created;
  }

  async updateContentProfile(userId: string, updates: Partial<InsertContentProfile>): Promise<ContentProfile | undefined> {
    const [updated] = await db
      .update(contentProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentProfiles.userId, userId))
      .returning();
    return updated;
  }

  async isContentProfileComplete(userId: string): Promise<boolean> {
    const profile = await this.getContentProfile(userId);
    return profile?.isProfileComplete === true;
  }

  // ==================== WORKER MONITORING METHODS ====================

  // Monitoring Consent methods
  async getMonitoringConsent(userId: string): Promise<MonitoringConsent | undefined> {
    const [consent] = await db
      .select()
      .from(monitoringConsent)
      .where(eq(monitoringConsent.userId, userId));
    return consent;
  }

  async createMonitoringConsent(consent: InsertMonitoringConsent): Promise<MonitoringConsent> {
    const [created] = await db.insert(monitoringConsent).values(consent).returning();
    return created;
  }

  async hasValidConsent(userId: string): Promise<boolean> {
    const consent = await this.getMonitoringConsent(userId);
    if (!consent) return false;
    return (
      consent.acknowledgedScreenCapture &&
      consent.acknowledgedActivityLogging &&
      consent.acknowledgedHourlyReports &&
      consent.acknowledgedDataStorage
    );
  }

  // Monitoring Session methods
  async getMonitoringSessions(userId?: string): Promise<MonitoringSession[]> {
    if (userId) {
      return await db
        .select()
        .from(monitoringSessions)
        .where(eq(monitoringSessions.userId, userId))
        .orderBy(desc(monitoringSessions.startedAt));
    }
    return await db
      .select()
      .from(monitoringSessions)
      .orderBy(desc(monitoringSessions.startedAt));
  }

  async getActiveMonitoringSession(userId: string): Promise<MonitoringSession | undefined> {
    const [session] = await db
      .select()
      .from(monitoringSessions)
      .where(
        and(
          eq(monitoringSessions.userId, userId),
          eq(monitoringSessions.status, "active")
        )
      );
    return session;
  }

  async getAllActiveMonitoringSessions(): Promise<MonitoringSession[]> {
    return await db
      .select()
      .from(monitoringSessions)
      .where(eq(monitoringSessions.status, "active"));
  }

  async getMonitoringSession(id: number): Promise<MonitoringSession | undefined> {
    const [session] = await db
      .select()
      .from(monitoringSessions)
      .where(eq(monitoringSessions.id, id));
    return session;
  }

  async createMonitoringSession(session: InsertMonitoringSession): Promise<MonitoringSession> {
    const [created] = await db.insert(monitoringSessions).values(session).returning();
    return created;
  }

  async updateMonitoringSession(id: number, updates: Partial<InsertMonitoringSession>): Promise<MonitoringSession | undefined> {
    const [updated] = await db
      .update(monitoringSessions)
      .set(updates)
      .where(eq(monitoringSessions.id, id))
      .returning();
    return updated;
  }

  async endMonitoringSession(id: number): Promise<MonitoringSession | undefined> {
    const session = await this.getMonitoringSession(id);
    if (!session) return undefined;
    
    const now = new Date();
    const durationMinutes = Math.floor((now.getTime() - session.startedAt.getTime()) / 60000);
    
    const [updated] = await db
      .update(monitoringSessions)
      .set({
        status: "ended",
        endedAt: now,
        totalDurationMinutes: durationMinutes,
      })
      .where(eq(monitoringSessions.id, id))
      .returning();
    return updated;
  }

  // Monitoring Screenshot methods
  async getMonitoringScreenshots(sessionId: number): Promise<MonitoringScreenshot[]> {
    return await db
      .select()
      .from(monitoringScreenshots)
      .where(eq(monitoringScreenshots.sessionId, sessionId))
      .orderBy(desc(monitoringScreenshots.capturedAt));
  }

  async getMonitoringScreenshotsByHour(userId: string, hourBucket: string): Promise<MonitoringScreenshot[]> {
    return await db
      .select()
      .from(monitoringScreenshots)
      .where(
        and(
          eq(monitoringScreenshots.userId, userId),
          eq(monitoringScreenshots.hourBucket, hourBucket)
        )
      )
      .orderBy(desc(monitoringScreenshots.capturedAt));
  }

  async getMonitoringScreenshot(id: number): Promise<MonitoringScreenshot | undefined> {
    const [screenshot] = await db
      .select()
      .from(monitoringScreenshots)
      .where(eq(monitoringScreenshots.id, id));
    return screenshot;
  }

  async createMonitoringScreenshot(screenshot: InsertMonitoringScreenshot): Promise<MonitoringScreenshot> {
    const [created] = await db.insert(monitoringScreenshots).values(screenshot).returning();
    
    // Update session screenshot count
    await db
      .update(monitoringSessions)
      .set({
        screenshotCount: sql`${monitoringSessions.screenshotCount} + 1`,
        lastActivityAt: new Date(),
      })
      .where(eq(monitoringSessions.id, screenshot.sessionId));
    
    return created;
  }

  // Monitoring Hourly Report methods
  async getMonitoringHourlyReports(userId?: string): Promise<MonitoringHourlyReport[]> {
    if (userId) {
      return await db
        .select()
        .from(monitoringHourlyReports)
        .where(eq(monitoringHourlyReports.userId, userId))
        .orderBy(desc(monitoringHourlyReports.hourStart));
    }
    return await db
      .select()
      .from(monitoringHourlyReports)
      .orderBy(desc(monitoringHourlyReports.hourStart));
  }

  async getMonitoringHourlyReport(id: number): Promise<MonitoringHourlyReport | undefined> {
    const [report] = await db
      .select()
      .from(monitoringHourlyReports)
      .where(eq(monitoringHourlyReports.id, id));
    return report;
  }

  async createMonitoringHourlyReport(report: InsertMonitoringHourlyReport): Promise<MonitoringHourlyReport> {
    const [created] = await db.insert(monitoringHourlyReports).values(report).returning();
    return created;
  }

  async getLatestHourlyReport(userId: string): Promise<MonitoringHourlyReport | undefined> {
    const [report] = await db
      .select()
      .from(monitoringHourlyReports)
      .where(eq(monitoringHourlyReports.userId, userId))
      .orderBy(desc(monitoringHourlyReports.hourStart))
      .limit(1);
    return report;
  }
  
  // ==================== PAYMENT REQUEST METHODS ====================
  
  async getPaymentRequests(userId?: string): Promise<PaymentRequest[]> {
    if (userId) {
      return await db
        .select()
        .from(paymentRequests)
        .where(eq(paymentRequests.requesterId, userId))
        .orderBy(desc(paymentRequests.requestedAt));
    }
    return await db
      .select()
      .from(paymentRequests)
      .orderBy(desc(paymentRequests.requestedAt));
  }
  
  async getPaymentRequest(id: number): Promise<PaymentRequest | undefined> {
    const [request] = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, id));
    return request;
  }
  
  async createPaymentRequest(request: InsertPaymentRequest): Promise<PaymentRequest> {
    const [created] = await db.insert(paymentRequests).values(request).returning();
    return created;
  }
  
  async updatePaymentRequestStatus(
    id: number, 
    status: PaymentRequestStatus, 
    reviewerId: string, 
    note?: string
  ): Promise<PaymentRequest | undefined> {
    const [updated] = await db
      .update(paymentRequests)
      .set({
        status,
        adminReviewerId: reviewerId,
        adminNote: note || null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentRequests.id, id))
      .returning();
    return updated;
  }
  
  async cancelPaymentRequest(id: number, requesterId: string): Promise<PaymentRequest | undefined> {
    const [updated] = await db
      .update(paymentRequests)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(paymentRequests.id, id),
          eq(paymentRequests.requesterId, requesterId),
          eq(paymentRequests.status, "pending")
        )
      )
      .returning();
    return updated;
  }
  
  async getPendingPaymentRequestCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(paymentRequests)
      .where(eq(paymentRequests.status, "pending"));
    return Number(result[0]?.count || 0);
  }
  
  // Payment Request Event methods
  async getPaymentRequestEvents(paymentRequestId: number): Promise<PaymentRequestEvent[]> {
    return await db
      .select()
      .from(paymentRequestEvents)
      .where(eq(paymentRequestEvents.paymentRequestId, paymentRequestId))
      .orderBy(desc(paymentRequestEvents.createdAt));
  }
  
  async createPaymentRequestEvent(event: InsertPaymentRequestEvent): Promise<PaymentRequestEvent> {
    const [created] = await db.insert(paymentRequestEvents).values(event).returning();
    return created;
  }
  
  // ==================== BRAND PACK METHODS ====================
  
  // Client Brand Pack methods
  async getClientBrandPacks(activeOnly: boolean = false): Promise<ClientBrandPack[]> {
    if (activeOnly) {
      return await db
        .select()
        .from(clientBrandPacks)
        .where(eq(clientBrandPacks.isActive, true))
        .orderBy(clientBrandPacks.clientName);
    }
    return await db
      .select()
      .from(clientBrandPacks)
      .orderBy(clientBrandPacks.clientName);
  }
  
  async getClientBrandPack(id: number): Promise<ClientBrandPack | undefined> {
    const [brandPack] = await db
      .select()
      .from(clientBrandPacks)
      .where(eq(clientBrandPacks.id, id));
    return brandPack;
  }
  
  async getClientBrandPackByName(clientName: string): Promise<ClientBrandPack | undefined> {
    const [brandPack] = await db
      .select()
      .from(clientBrandPacks)
      .where(eq(clientBrandPacks.clientName, clientName));
    return brandPack;
  }
  
  async createClientBrandPack(brandPack: InsertClientBrandPack): Promise<ClientBrandPack> {
    const [created] = await db.insert(clientBrandPacks).values(brandPack).returning();
    return created;
  }
  
  async updateClientBrandPack(id: number, updates: Partial<InsertClientBrandPack>): Promise<ClientBrandPack | undefined> {
    const [updated] = await db
      .update(clientBrandPacks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clientBrandPacks.id, id))
      .returning();
    return updated;
  }
  
  async deleteClientBrandPack(id: number): Promise<boolean> {
    const result = await db.delete(clientBrandPacks).where(eq(clientBrandPacks.id, id)).returning();
    return result.length > 0;
  }
  
  // Brand Pack File methods
  async getBrandPackFiles(brandPackId: number): Promise<BrandPackFile[]> {
    return await db
      .select()
      .from(brandPackFiles)
      .where(eq(brandPackFiles.brandPackId, brandPackId))
      .orderBy(brandPackFiles.category, brandPackFiles.originalName);
  }
  
  async getBrandPackFile(id: number): Promise<BrandPackFile | undefined> {
    const [file] = await db
      .select()
      .from(brandPackFiles)
      .where(eq(brandPackFiles.id, id));
    return file;
  }
  
  async createBrandPackFile(file: InsertBrandPackFile): Promise<BrandPackFile> {
    const [created] = await db.insert(brandPackFiles).values(file).returning();
    return created;
  }
  
  async updateBrandPackFile(id: number, updates: Partial<InsertBrandPackFile>): Promise<BrandPackFile | undefined> {
    const [updated] = await db
      .update(brandPackFiles)
      .set(updates)
      .where(eq(brandPackFiles.id, id))
      .returning();
    return updated;
  }
  
  async deleteBrandPackFile(id: number): Promise<boolean> {
    const result = await db.delete(brandPackFiles).where(eq(brandPackFiles.id, id)).returning();
    return result.length > 0;
  }
  
  // ==================== SHEETS HUB METHODS ====================
  
  // Connected Sheet methods
  async getConnectedSheets(): Promise<ConnectedSheet[]> {
    return await db
      .select()
      .from(connectedSheets)
      .orderBy(desc(connectedSheets.createdAt));
  }
  
  async getConnectedSheet(id: number): Promise<ConnectedSheet | undefined> {
    const [sheet] = await db
      .select()
      .from(connectedSheets)
      .where(eq(connectedSheets.id, id));
    return sheet;
  }
  
  async getConnectedSheetBySheetId(sheetId: string): Promise<ConnectedSheet | undefined> {
    const [sheet] = await db
      .select()
      .from(connectedSheets)
      .where(eq(connectedSheets.sheetId, sheetId));
    return sheet;
  }
  
  async createConnectedSheet(sheet: InsertConnectedSheet): Promise<ConnectedSheet> {
    const [created] = await db.insert(connectedSheets).values(sheet).returning();
    return created;
  }
  
  async updateConnectedSheet(id: number, updates: Partial<InsertConnectedSheet>): Promise<ConnectedSheet | undefined> {
    const [updated] = await db
      .update(connectedSheets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(connectedSheets.id, id))
      .returning();
    return updated;
  }
  
  async updateSheetSyncStatus(id: number, status: string, message?: string): Promise<ConnectedSheet | undefined> {
    const [updated] = await db
      .update(connectedSheets)
      .set({ 
        lastSyncAt: new Date(),
        lastSyncStatus: status,
        lastSyncMessage: message || null,
        updatedAt: new Date()
      })
      .where(eq(connectedSheets.id, id))
      .returning();
    return updated;
  }
  
  async deleteConnectedSheet(id: number): Promise<boolean> {
    const result = await db.delete(connectedSheets).where(eq(connectedSheets.id, id)).returning();
    return result.length > 0;
  }
  
  // Payroll Record methods
  async getPayrollRecords(sheetId?: number): Promise<PayrollRecord[]> {
    if (sheetId) {
      return await db
        .select()
        .from(payrollRecords)
        .where(eq(payrollRecords.connectedSheetId, sheetId))
        .orderBy(desc(payrollRecords.syncedAt));
    }
    return await db
      .select()
      .from(payrollRecords)
      .orderBy(desc(payrollRecords.syncedAt));
  }
  
  async getPayrollRecord(id: number): Promise<PayrollRecord | undefined> {
    const [record] = await db
      .select()
      .from(payrollRecords)
      .where(eq(payrollRecords.id, id));
    return record;
  }
  
  async createPayrollRecord(record: InsertPayrollRecord): Promise<PayrollRecord> {
    const [created] = await db.insert(payrollRecords).values(record).returning();
    return created;
  }
  
  async createPayrollRecordsBulk(records: InsertPayrollRecord[]): Promise<PayrollRecord[]> {
    if (records.length === 0) return [];
    const created = await db.insert(payrollRecords).values(records).returning();
    return created;
  }
  
  async updatePayrollRecord(id: number, updates: Partial<InsertPayrollRecord>): Promise<PayrollRecord | undefined> {
    const [updated] = await db
      .update(payrollRecords)
      .set(updates)
      .where(eq(payrollRecords.id, id))
      .returning();
    return updated;
  }
  
  async deletePayrollRecordsBySheet(sheetId: number): Promise<number> {
    const result = await db.delete(payrollRecords).where(eq(payrollRecords.connectedSheetId, sheetId)).returning();
    return result.length;
  }
  
  async getPayrollAggregations(sheetId?: number): Promise<{ entityName: string; totalIn: number; totalOut: number; count: number }[]> {
    let query = db
      .select({
        entityName: payrollRecords.entityName,
        totalIn: sql<number>`COALESCE(SUM(CAST(NULLIF(REPLACE(${payrollRecords.amountIn}, ',', ''), '') AS DECIMAL)), 0)`,
        totalOut: sql<number>`COALESCE(SUM(CAST(NULLIF(REPLACE(${payrollRecords.amountOut}, ',', ''), '') AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(payrollRecords)
      .groupBy(payrollRecords.entityName);
    
    if (sheetId) {
      query = query.where(eq(payrollRecords.connectedSheetId, sheetId)) as any;
    }
    
    const results = await query;
    return results.map(r => ({
      entityName: r.entityName,
      totalIn: Number(r.totalIn) || 0,
      totalOut: Number(r.totalOut) || 0,
      count: Number(r.count) || 0,
    }));
  }
  
  // Sheet Sync Log methods
  async getSheetSyncLogs(sheetId?: number, limit: number = 50): Promise<SheetSyncLog[]> {
    if (sheetId) {
      return await db
        .select()
        .from(sheetSyncLogs)
        .where(eq(sheetSyncLogs.connectedSheetId, sheetId))
        .orderBy(desc(sheetSyncLogs.startedAt))
        .limit(limit);
    }
    return await db
      .select()
      .from(sheetSyncLogs)
      .orderBy(desc(sheetSyncLogs.startedAt))
      .limit(limit);
  }
  
  async createSheetSyncLog(log: InsertSheetSyncLog): Promise<SheetSyncLog> {
    const [created] = await db.insert(sheetSyncLogs).values(log).returning();
    return created;
  }
  
  async updateSheetSyncLog(id: number, updates: Partial<InsertSheetSyncLog>): Promise<SheetSyncLog | undefined> {
    const [updated] = await db
      .update(sheetSyncLogs)
      .set({ ...updates, completedAt: updates.status ? new Date() : undefined })
      .where(eq(sheetSyncLogs.id, id))
      .returning();
    return updated;
  }
  
  // Multi-Column Task methods
  async getMultiColumnTasks(sheetId?: number): Promise<MultiColumnTask[]> {
    if (sheetId) {
      return await db
        .select()
        .from(multiColumnTasks)
        .where(eq(multiColumnTasks.connectedSheetId, sheetId))
        .orderBy(multiColumnTasks.columnName, multiColumnTasks.rowIndex);
    }
    return await db
      .select()
      .from(multiColumnTasks)
      .orderBy(multiColumnTasks.columnName, multiColumnTasks.rowIndex);
  }
  
  async createMultiColumnTask(task: InsertMultiColumnTask): Promise<MultiColumnTask> {
    const [created] = await db.insert(multiColumnTasks).values(task).returning();
    return created;
  }
  
  async createMultiColumnTasksBulk(tasks: InsertMultiColumnTask[]): Promise<MultiColumnTask[]> {
    if (tasks.length === 0) return [];
    const created = await db.insert(multiColumnTasks).values(tasks).returning();
    return created;
  }
  
  async deleteMultiColumnTasksBySheet(sheetId: number): Promise<number> {
    const result = await db.delete(multiColumnTasks).where(eq(multiColumnTasks.connectedSheetId, sheetId)).returning();
    return result.length;
  }
  
  async getMultiColumnTasksByColumn(sheetId: number): Promise<{ columnName: string; tasks: MultiColumnTask[] }[]> {
    const allTasks = await this.getMultiColumnTasks(sheetId);
    const grouped: Record<string, MultiColumnTask[]> = {};
    
    for (const task of allTasks) {
      if (!grouped[task.columnName]) {
        grouped[task.columnName] = [];
      }
      grouped[task.columnName].push(task);
    }
    
    return Object.entries(grouped).map(([columnName, tasks]) => ({
      columnName,
      tasks,
    }));
  }
  
  // ==================== CLIENT CREDITS METHODS ====================
  
  async getClientCredit(userId: string): Promise<ClientCredit | undefined> {
    const [credit] = await db.select().from(clientCredits).where(eq(clientCredits.userId, userId));
    return credit;
  }
  
  async getClientCredits(): Promise<ClientCredit[]> {
    return await db.select().from(clientCredits).orderBy(desc(clientCredits.updatedAt));
  }
  
  async createClientCredit(credit: InsertClientCredit): Promise<ClientCredit> {
    const [created] = await db.insert(clientCredits).values(credit).returning();
    return created;
  }
  
  async updateClientCredit(userId: string, updates: Partial<InsertClientCredit>): Promise<ClientCredit | undefined> {
    const [updated] = await db
      .update(clientCredits)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clientCredits.userId, userId))
      .returning();
    return updated;
  }
  
  async addClientCredit(userId: string, amount: number, description: string, performedBy: string): Promise<ClientCredit> {
    // Get or create credit record
    let credit = await this.getClientCredit(userId);
    
    if (!credit) {
      credit = await this.createClientCredit({
        userId,
        balance: 0,
        currency: "USD",
      });
    }
    
    const newBalance = credit.balance + amount;
    
    // Update the balance
    const [updated] = await db
      .update(clientCredits)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(clientCredits.userId, userId))
      .returning();
    
    // Record the transaction
    await this.createCreditTransaction({
      userId,
      type: "credit_added",
      amount,
      balanceAfter: newBalance,
      description,
      performedBy,
    });
    
    return updated;
  }
  
  async deductClientCredit(userId: string, amount: number, description: string, taskId?: number, performedBy?: string): Promise<ClientCredit> {
    const credit = await this.getClientCredit(userId);
    
    if (!credit) {
      throw new Error("No credit record found for user");
    }
    
    if (credit.balance < amount) {
      throw new Error("Insufficient credit balance");
    }
    
    const newBalance = credit.balance - amount;
    
    // Update the balance
    const [updated] = await db
      .update(clientCredits)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(clientCredits.userId, userId))
      .returning();
    
    // Record the transaction
    await this.createCreditTransaction({
      userId,
      type: "credit_used",
      amount: -amount, // Negative for deductions
      balanceAfter: newBalance,
      description,
      taskId,
      performedBy,
    });
    
    return updated;
  }
  
  async getCreditTransactions(userId: string, limit: number = 50): Promise<CreditTransaction[]> {
    return await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);
  }
  
  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const [created] = await db.insert(creditTransactions).values(transaction).returning();
    return created;
  }
  
  // ==================== CREDIT REQUESTS IMPLEMENTATION ====================
  
  async getCreditRequests(userId?: string): Promise<CreditRequest[]> {
    if (userId) {
      return await db
        .select()
        .from(creditRequests)
        .where(eq(creditRequests.requesterId, userId))
        .orderBy(desc(creditRequests.requestedAt));
    }
    return await db
      .select()
      .from(creditRequests)
      .orderBy(desc(creditRequests.requestedAt));
  }
  
  async getCreditRequest(id: number): Promise<CreditRequest | undefined> {
    const [request] = await db.select().from(creditRequests).where(eq(creditRequests.id, id));
    return request;
  }
  
  async createCreditRequest(request: InsertCreditRequest): Promise<CreditRequest> {
    const [created] = await db.insert(creditRequests).values(request).returning();
    return created;
  }
  
  async updateCreditRequest(id: number, updates: Partial<CreditRequest>): Promise<CreditRequest | undefined> {
    const [updated] = await db
      .update(creditRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(creditRequests.id, id))
      .returning();
    return updated;
  }
  
  async cancelCreditRequest(id: number, userId: string): Promise<CreditRequest | undefined> {
    const request = await this.getCreditRequest(id);
    if (!request || request.requesterId !== userId || request.status !== "pending") {
      return undefined;
    }
    return await this.updateCreditRequest(id, { status: "cancelled" });
  }
  
  async approveCreditRequest(id: number, adminId: string, approvedAmount: number, note?: string): Promise<CreditRequest | undefined> {
    const request = await this.getCreditRequest(id);
    if (!request || request.status !== "pending") {
      return undefined;
    }
    
    // Update the request
    const updated = await this.updateCreditRequest(id, {
      status: "approved",
      adminReviewerId: adminId,
      approvedAmount,
      adminNote: note,
      reviewedAt: new Date(),
    });
    
    // Add the credits to the user's balance
    if (updated) {
      await this.addClientCredit(
        request.requesterId,
        approvedAmount,
        `Credit request #${id} approved`,
        adminId
      );
    }
    
    return updated;
  }
  
  async rejectCreditRequest(id: number, adminId: string, note?: string): Promise<CreditRequest | undefined> {
    const request = await this.getCreditRequest(id);
    if (!request || request.status !== "pending") {
      return undefined;
    }
    
    return await this.updateCreditRequest(id, {
      status: "rejected",
      adminReviewerId: adminId,
      adminNote: note,
      reviewedAt: new Date(),
    });
  }
  
  async getPendingCreditRequests(): Promise<CreditRequest[]> {
    return await db
      .select()
      .from(creditRequests)
      .where(eq(creditRequests.status, "pending"))
      .orderBy(desc(creditRequests.requestedAt));
  }
  
  // ==================== CONTENT ORDERS IMPLEMENTATION ====================
  
  async getContentOrders(clientId?: string): Promise<ContentOrder[]> {
    if (clientId) {
      return await db
        .select()
        .from(contentOrders)
        .where(eq(contentOrders.clientId, clientId))
        .orderBy(desc(contentOrders.createdAt));
    }
    return await db
      .select()
      .from(contentOrders)
      .orderBy(desc(contentOrders.createdAt));
  }
  
  async getContentOrder(id: number): Promise<ContentOrder | undefined> {
    const [order] = await db.select().from(contentOrders).where(eq(contentOrders.id, id));
    return order;
  }
  
  async createContentOrder(order: InsertContentOrder): Promise<ContentOrder> {
    const [created] = await db.insert(contentOrders).values(order).returning();
    return created;
  }
  
  async updateContentOrder(id: number, updates: Partial<ContentOrder>): Promise<ContentOrder | undefined> {
    const [updated] = await db
      .update(contentOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentOrders.id, id))
      .returning();
    return updated;
  }
  
  async submitContentOrder(id: number, userId: string): Promise<ContentOrder | undefined> {
    const order = await this.getContentOrder(id);
    if (!order || order.clientId !== userId || order.status !== "draft") {
      return undefined;
    }
    
    // Check if client has enough credits
    const credit = await this.getClientCredit(userId);
    if (!credit || credit.balance < order.creditCost) {
      throw new Error("Insufficient credits to submit this order");
    }
    
    // Deduct the credits
    await this.deductClientCredit(
      userId,
      order.creditCost,
      `Content order #${id}: ${order.title}`,
      undefined,
      userId
    );
    
    // Update order status
    return await this.updateContentOrder(id, {
      status: "submitted",
      submittedAt: new Date(),
    });
  }
  
  async assignContentOrder(id: number, assignedTo: string, adminId: string): Promise<ContentOrder | undefined> {
    const order = await this.getContentOrder(id);
    if (!order || (order.status !== "submitted" && order.status !== "in_progress")) {
      return undefined;
    }
    
    return await this.updateContentOrder(id, {
      assignedTo,
      status: "in_progress",
    });
  }
  
  async completeContentOrder(id: number, deliverableUrl: string, adminId: string): Promise<ContentOrder | undefined> {
    const order = await this.getContentOrder(id);
    if (!order || (order.status !== "in_progress" && order.status !== "review")) {
      return undefined;
    }
    
    return await this.updateContentOrder(id, {
      status: "completed",
      deliverableUrl,
      completedAt: new Date(),
    });
  }
  
  async cancelContentOrder(id: number, userId: string): Promise<ContentOrder | undefined> {
    const order = await this.getContentOrder(id);
    if (!order) {
      return undefined;
    }
    
    // Only allow cancellation of draft orders by the client
    if (order.status === "draft" && order.clientId === userId) {
      return await this.updateContentOrder(id, { status: "cancelled" });
    }
    
    // For submitted orders, refund the credits
    if (order.status === "submitted" && order.clientId === userId) {
      await this.addClientCredit(
        userId,
        order.creditCost,
        `Refund for cancelled order #${id}: ${order.title}`,
        userId
      );
      return await this.updateContentOrder(id, { status: "cancelled" });
    }
    
    return undefined;
  }
  
  async getOrdersForTeamMember(assignedTo: string): Promise<ContentOrder[]> {
    return await db
      .select()
      .from(contentOrders)
      .where(eq(contentOrders.assignedTo, assignedTo))
      .orderBy(desc(contentOrders.createdAt));
  }
  
  // ==================== CLIENT ONBOARDING IMPLEMENTATION ====================
  
  async getClientOnboarding(userId: string): Promise<ClientOnboarding | undefined> {
    const [onboarding] = await db
      .select()
      .from(clientOnboarding)
      .where(eq(clientOnboarding.userId, userId));
    return onboarding;
  }
  
  async createClientOnboarding(onboarding: InsertClientOnboarding): Promise<ClientOnboarding> {
    const [created] = await db.insert(clientOnboarding).values(onboarding).returning();
    return created;
  }
  
  async updateClientOnboarding(userId: string, updates: Partial<ClientOnboarding>): Promise<ClientOnboarding | undefined> {
    // Check if all onboarding steps are complete
    const current = await this.getClientOnboarding(userId);
    if (!current) {
      return undefined;
    }
    
    const merged = { ...current, ...updates };
    const allComplete = merged.hasSeenWelcome && 
                        merged.hasViewedCredits && 
                        merged.hasPlacedFirstOrder && 
                        merged.hasViewedBrandPacks && 
                        merged.hasViewedTransactionHistory;
    
    const [updated] = await db
      .update(clientOnboarding)
      .set({ 
        ...updates, 
        updatedAt: new Date(),
        completedAt: allComplete && !current.completedAt ? new Date() : current.completedAt,
      })
      .where(eq(clientOnboarding.userId, userId))
      .returning();
    return updated;
  }
  
  async markClientOnboardingStep(userId: string, step: keyof InsertClientOnboarding): Promise<ClientOnboarding | undefined> {
    // Create onboarding record if doesn't exist
    let onboarding = await this.getClientOnboarding(userId);
    if (!onboarding) {
      onboarding = await this.createClientOnboarding({ userId, [step]: true });
      return onboarding;
    }
    
    return await this.updateClientOnboarding(userId, { [step]: true });
  }
  
  // ==================== WEB3 ONBOARDING IMPLEMENTATION ====================
  
  async getWeb3Onboarding(userId: string): Promise<Web3Onboarding | undefined> {
    const [onboarding] = await db
      .select()
      .from(web3Onboarding)
      .where(eq(web3Onboarding.userId, userId));
    return onboarding;
  }
  
  async createWeb3Onboarding(onboarding: InsertWeb3Onboarding): Promise<Web3Onboarding> {
    const [created] = await db.insert(web3Onboarding).values(onboarding).returning();
    return created;
  }
  
  async updateWeb3Onboarding(userId: string, updates: Partial<Web3Onboarding>): Promise<Web3Onboarding | undefined> {
    // Check if all onboarding steps are complete
    const current = await this.getWeb3Onboarding(userId);
    if (!current) {
      return undefined;
    }
    
    const merged = { ...current, ...updates };
    const allComplete = merged.hasSeenWelcome && 
                        merged.hasComparedAddresses && 
                        merged.hasExtractedAddresses && 
                        merged.hasCreatedCollection && 
                        merged.hasViewedHistory &&
                        merged.hasUsedMerge;
    
    const [updated] = await db
      .update(web3Onboarding)
      .set({ 
        ...updates, 
        updatedAt: new Date(),
        completedAt: allComplete && !current.completedAt ? new Date() : current.completedAt,
      })
      .where(eq(web3Onboarding.userId, userId))
      .returning();
    return updated;
  }
  
  async markWeb3OnboardingStep(userId: string, step: keyof InsertWeb3Onboarding): Promise<Web3Onboarding | undefined> {
    // Create onboarding record if doesn't exist
    let onboarding = await this.getWeb3Onboarding(userId);
    if (!onboarding) {
      onboarding = await this.createWeb3Onboarding({ userId, [step]: true });
      return onboarding;
    }
    
    return await this.updateWeb3Onboarding(userId, { [step]: true });
  }
  
  // ==================== CLIENT WORK LIBRARY IMPLEMENTATION ====================
  
  async getClientWorkItems(brandPackId?: number): Promise<ClientWorkItem[]> {
    if (brandPackId) {
      return await db
        .select()
        .from(clientWorkItems)
        .where(eq(clientWorkItems.brandPackId, brandPackId))
        .orderBy(desc(clientWorkItems.createdAt));
    }
    return await db
      .select()
      .from(clientWorkItems)
      .orderBy(desc(clientWorkItems.createdAt));
  }
  
  async getClientWorkItem(id: number): Promise<ClientWorkItem | undefined> {
    const [item] = await db
      .select()
      .from(clientWorkItems)
      .where(eq(clientWorkItems.id, id));
    return item;
  }
  
  async getClientWorkItemsByUploader(uploaderId: string): Promise<ClientWorkItem[]> {
    return await db
      .select()
      .from(clientWorkItems)
      .where(eq(clientWorkItems.uploadedBy, uploaderId))
      .orderBy(desc(clientWorkItems.createdAt));
  }
  
  async createClientWorkItem(item: InsertClientWorkItem): Promise<ClientWorkItem> {
    const [created] = await db.insert(clientWorkItems).values(item).returning();
    return created;
  }
  
  async updateClientWorkItem(id: number, updates: Partial<InsertClientWorkItem>): Promise<ClientWorkItem | undefined> {
    const [updated] = await db
      .update(clientWorkItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clientWorkItems.id, id))
      .returning();
    return updated;
  }
  
  async deleteClientWorkItem(id: number): Promise<boolean> {
    const result = await db.delete(clientWorkItems).where(eq(clientWorkItems.id, id));
    return result.rowCount > 0;
  }
  
  async getClientWorkItemsByTask(taskId: number): Promise<ClientWorkItem[]> {
    return await db
      .select()
      .from(clientWorkItems)
      .where(eq(clientWorkItems.taskId, taskId))
      .orderBy(desc(clientWorkItems.createdAt));
  }
  
  async getClientWorkItemsByCampaign(campaignId: number): Promise<ClientWorkItem[]> {
    return await db
      .select()
      .from(clientWorkItems)
      .where(eq(clientWorkItems.campaignId, campaignId))
      .orderBy(desc(clientWorkItems.createdAt));
  }
  
  async getClientWorkStats(): Promise<{ uploaderId: string; brandPackId: number; count: number; latestUpload: Date | null }[]> {
    const result = await db
      .select({
        uploaderId: clientWorkItems.uploadedBy,
        brandPackId: clientWorkItems.brandPackId,
        count: sql<number>`count(*)::int`,
        latestUpload: sql<Date | null>`max(${clientWorkItems.createdAt})`,
      })
      .from(clientWorkItems)
      .groupBy(clientWorkItems.uploadedBy, clientWorkItems.brandPackId);
    return result;
  }
}

export const storage = new DbStorage();
