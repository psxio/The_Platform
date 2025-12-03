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
  // Discord Integration types
  type DiscordConnection, type InsertDiscordConnection, discordConnections,
  type DiscordPresenceSession, type InsertDiscordPresenceSession, discordPresenceSessions,
  type DiscordSettings, type InsertDiscordSettings, discordSettings,
  // Order Templates types
  type OrderTemplate, type InsertOrderTemplate, orderTemplates,
  type SavedOrder, type InsertSavedOrder, savedOrders,
  // Approval Workflow types
  type ApprovalWorkflow, type InsertApprovalWorkflow, approvalWorkflows,
  type ApprovalWorkflowStage, type InsertApprovalWorkflowStage, approvalWorkflowStages,
  // Task Messages types
  type TaskMessage, type InsertTaskMessage, taskMessages,
  // Deliverable Annotations types
  type DeliverableAnnotation, type InsertDeliverableAnnotation, deliverableAnnotations,
  // Client Profile types
  type ClientProfile, type InsertClientProfile, clientProfiles,
  type ClientCalendarEvent, type InsertClientCalendarEvent, clientCalendarEvents,
  type ClientTaskLink, type InsertClientTaskLink, clientTaskLinks,
  // Internal Team Member types
  type InternalTeamMember, type InsertInternalTeamMember, internalTeamMembers,
  type TeamPaymentHistory, type InsertTeamPaymentHistory, teamPaymentHistory,
  // Team Member Client Assignments types
  type TeamMemberClientAssignment, type InsertTeamMemberClientAssignment, teamMemberClientAssignments,
  // Content Ideas (Pre-Production Approval) types
  type ContentIdea, type InsertContentIdea, contentIdeas,
  // Team Structure Templates
  type TeamStructureTemplate, type InsertTeamStructureTemplate, teamStructureTemplates,
  // Saved Items (Pinned Content)
  type SavedItem, type InsertSavedItem, savedItems,
  // Feedback Submissions
  type FeedbackSubmission, type InsertFeedbackSubmission, feedbackSubmissions,
  // YouTube References
  type YoutubeReference, type InsertYoutubeReference, youtubeReferences,
  // Burndown Snapshots
  type BurndownSnapshot, type InsertBurndownSnapshot, burndownSnapshots,
  // Library Assets (Enhanced)
  type LibraryAsset, type InsertLibraryAsset, libraryAssets,
  // Task Subtasks (Checklists)
  type TaskSubtask, type InsertTaskSubtask, taskSubtasks,
  // Task Enhancements (Priority, Time, Client linking)
  type TaskEnhancement, type InsertTaskEnhancement, taskEnhancements,
  // Client Documents (Docs Hub)
  type ClientDocument, type InsertClientDocument, clientDocuments,
  // Whiteboards
  type Whiteboard, type InsertWhiteboard, whiteboards,
  type WhiteboardElement, type InsertWhiteboardElement, whiteboardElements,
  type WhiteboardConnector, type InsertWhiteboardConnector, whiteboardConnectors,
  type WhiteboardCollaborator, type InsertWhiteboardCollaborator, whiteboardCollaborators,
  // DAO Management System
  type DaoRole, type InsertDaoRole, daoRoles,
  type DaoMembership, type InsertDaoMembership, daoMemberships,
  type DaoServiceCatalog, type InsertDaoServiceCatalog, daoServiceCatalog,
  type DaoDiscount, type InsertDaoDiscount, daoDiscounts,
  type DaoProject, type InsertDaoProject, daoProjects,
  type DaoProjectService, type InsertDaoProjectService, daoProjectServices,
  type DaoRevenueAttribution, type InsertDaoRevenueAttribution, daoRevenueAttributions,
  type DaoDebrief, type InsertDaoDebrief, daoDebriefs,
  type DaoTreasury, daoTreasury,
  type DaoTreasuryTransaction, type InsertDaoTreasuryTransaction, daoTreasuryTransactions,
  type DaoBonusRun, type InsertDaoBonusRun, daoBonusRuns,
  type DaoBonusRunRecipient, type InsertDaoBonusRunRecipient, daoBonusRunRecipients,
  type DaoInvoice, type InsertDaoInvoice, daoInvoices,
  type DaoRankProgression, type InsertDaoRankProgression, daoRankProgressions,
  type DaoProjectLink, type InsertDaoProjectLink, daoProjectLinks,
  type DaoPermission, type InsertDaoPermission, daoPermissions,
  type DaoSafeWallet, type InsertDaoSafeWallet, daoSafeWallets,
  type DaoSafeBalance, type InsertDaoSafeBalance, daoSafeBalances,
  type DaoSafePendingTx, type InsertDaoSafePendingTx, daoSafePendingTxs,
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
  getApprovalsByReviewer(reviewerId: string): Promise<Approval[]>;
  getPendingApprovals(reviewerId: string): Promise<Approval[]>;
  
  // Approval Workflow methods
  getApprovalWorkflows(): Promise<ApprovalWorkflow[]>;
  getApprovalWorkflow(id: number): Promise<ApprovalWorkflow | undefined>;
  getApprovalWorkflowByContentType(contentType: string): Promise<ApprovalWorkflow | undefined>;
  createApprovalWorkflow(workflow: InsertApprovalWorkflow): Promise<ApprovalWorkflow>;
  updateApprovalWorkflow(id: number, workflow: Partial<InsertApprovalWorkflow>): Promise<ApprovalWorkflow | undefined>;
  deleteApprovalWorkflow(id: number): Promise<boolean>;
  
  // Approval Workflow Stage methods
  getApprovalWorkflowStages(workflowId: number): Promise<ApprovalWorkflowStage[]>;
  createApprovalWorkflowStage(stage: InsertApprovalWorkflowStage): Promise<ApprovalWorkflowStage>;
  updateApprovalWorkflowStage(id: number, stage: Partial<InsertApprovalWorkflowStage>): Promise<ApprovalWorkflowStage | undefined>;
  deleteApprovalWorkflowStage(id: number): Promise<boolean>;
  applyWorkflowToTask(taskId: number, workflowId: number): Promise<Approval[]>;
  
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
  
  // ==================== DISCORD INTEGRATION METHODS ====================
  
  // Discord Connection methods
  getDiscordConnection(userId: string): Promise<DiscordConnection | undefined>;
  getDiscordConnectionByDiscordId(discordUserId: string): Promise<DiscordConnection | undefined>;
  getAllDiscordConnections(): Promise<DiscordConnection[]>;
  createDiscordConnection(connection: InsertDiscordConnection): Promise<DiscordConnection>;
  updateDiscordConnection(userId: string, updates: Partial<InsertDiscordConnection>): Promise<DiscordConnection | undefined>;
  deleteDiscordConnection(userId: string): Promise<boolean>;
  
  // Discord Presence Session methods
  getActivePresenceSessions(): Promise<DiscordPresenceSession[]>;
  getPresenceSession(userId: string): Promise<DiscordPresenceSession | undefined>;
  getActivePresenceByDiscordId(discordUserId: string): Promise<DiscordPresenceSession | undefined>;
  createPresenceSession(session: InsertDiscordPresenceSession): Promise<DiscordPresenceSession>;
  updatePresenceSession(id: number, updates: Partial<DiscordPresenceSession>): Promise<DiscordPresenceSession | undefined>;
  endPresenceSession(discordUserId: string): Promise<DiscordPresenceSession | undefined>;
  getUserPresenceHistory(userId: string, limit?: number): Promise<DiscordPresenceSession[]>;
  
  // Discord Settings methods
  getDiscordSettings(): Promise<DiscordSettings | undefined>;
  createDiscordSettings(settings: InsertDiscordSettings): Promise<DiscordSettings>;
  updateDiscordSettings(id: number, updates: Partial<InsertDiscordSettings>): Promise<DiscordSettings | undefined>;
  updateBotHeartbeat(): Promise<void>;
  
  // ==================== ORDER TEMPLATES METHODS ====================
  
  // Order Templates methods
  getOrderTemplates(activeOnly?: boolean): Promise<OrderTemplate[]>;
  getOrderTemplate(id: number): Promise<OrderTemplate | undefined>;
  createOrderTemplate(template: InsertOrderTemplate): Promise<OrderTemplate>;
  updateOrderTemplate(id: number, updates: Partial<InsertOrderTemplate>): Promise<OrderTemplate | undefined>;
  deleteOrderTemplate(id: number): Promise<boolean>;
  
  // Saved Orders methods
  getSavedOrders(clientId: string): Promise<SavedOrder[]>;
  getSavedOrder(id: number): Promise<SavedOrder | undefined>;
  createSavedOrder(order: InsertSavedOrder): Promise<SavedOrder>;
  updateSavedOrder(id: number, updates: Partial<InsertSavedOrder>): Promise<SavedOrder | undefined>;
  deleteSavedOrder(id: number): Promise<boolean>;
  incrementSavedOrderUsage(id: number): Promise<SavedOrder | undefined>;

  // ==================== TASK MESSAGES METHODS ====================
  
  // Task Message methods for client-team communication
  getTaskMessages(taskId?: number, orderId?: number, includeInternal?: boolean): Promise<TaskMessage[]>;
  getTaskMessage(id: number): Promise<TaskMessage | undefined>;
  createTaskMessage(message: InsertTaskMessage): Promise<TaskMessage>;
  markMessageReadByClient(id: number): Promise<TaskMessage | undefined>;
  markMessageReadByTeam(id: number): Promise<TaskMessage | undefined>;
  markAllMessagesReadByClient(orderId: number): Promise<void>;
  markAllMessagesReadByTeam(orderId: number): Promise<void>;
  getUnreadClientMessageCount(orderId: number): Promise<number>;
  getUnreadTeamMessageCount(orderId: number): Promise<number>;

  // ==================== DELIVERABLE ANNOTATIONS METHODS ====================
  
  // Deliverable Annotation methods
  getDeliverableAnnotations(deliverableId: number, versionId?: number): Promise<DeliverableAnnotation[]>;
  getDeliverableAnnotation(id: number): Promise<DeliverableAnnotation | undefined>;
  createDeliverableAnnotation(annotation: InsertDeliverableAnnotation): Promise<DeliverableAnnotation>;
  updateDeliverableAnnotation(id: number, updates: Partial<InsertDeliverableAnnotation>): Promise<DeliverableAnnotation | undefined>;
  resolveDeliverableAnnotation(id: number, resolvedBy: string): Promise<DeliverableAnnotation | undefined>;
  deleteDeliverableAnnotation(id: number): Promise<boolean>;
  
  // Client Profile methods
  getClientProfiles(): Promise<ClientProfile[]>;
  getClientProfile(id: number): Promise<ClientProfile | undefined>;
  getClientProfileBySlug(slug: string): Promise<ClientProfile | undefined>;
  createClientProfile(profile: InsertClientProfile): Promise<ClientProfile>;
  updateClientProfile(id: number, profile: Partial<InsertClientProfile>): Promise<ClientProfile | undefined>;
  deleteClientProfile(id: number): Promise<boolean>;
  searchClientProfiles(query: string): Promise<ClientProfile[]>;
  
  // Client Calendar Event methods
  getClientCalendarEvents(clientProfileId: number): Promise<ClientCalendarEvent[]>;
  getClientCalendarEvent(id: number): Promise<ClientCalendarEvent | undefined>;
  getAllCalendarEvents(startDate?: Date, endDate?: Date): Promise<ClientCalendarEvent[]>;
  createClientCalendarEvent(event: InsertClientCalendarEvent): Promise<ClientCalendarEvent>;
  updateClientCalendarEvent(id: number, event: Partial<InsertClientCalendarEvent>): Promise<ClientCalendarEvent | undefined>;
  deleteClientCalendarEvent(id: number): Promise<boolean>;
  getCalendarEventsByGoogleId(googleEventId: string): Promise<ClientCalendarEvent | undefined>;
  updateCalendarEventSyncStatus(id: number, status: string, googleEventId?: string): Promise<ClientCalendarEvent | undefined>;
  
  // Client Task Link methods
  linkTaskToClient(clientProfileId: number, taskId?: number, orderId?: number): Promise<ClientTaskLink>;
  getClientTaskLinks(clientProfileId: number): Promise<ClientTaskLink[]>;
  getClientForTask(taskId: number): Promise<ClientProfile | undefined>;
  getClientForOrder(orderId: number): Promise<ClientProfile | undefined>;
  unlinkTaskFromClient(id: number): Promise<boolean>;
  
  // ==================== INTERNAL TEAM MEMBERS METHODS ====================
  
  // Internal Team Member methods
  getInternalTeamMembers(): Promise<InternalTeamMember[]>;
  getInternalTeamMember(id: number): Promise<InternalTeamMember | undefined>;
  getInternalTeamMemberByName(name: string): Promise<InternalTeamMember | undefined>;
  createInternalTeamMember(member: InsertInternalTeamMember): Promise<InternalTeamMember>;
  updateInternalTeamMember(id: number, updates: Partial<InsertInternalTeamMember>): Promise<InternalTeamMember | undefined>;
  deleteInternalTeamMember(id: number): Promise<boolean>;
  searchInternalTeamMembers(query: string): Promise<InternalTeamMember[]>;
  getTeamMembersByDepartment(department: string): Promise<InternalTeamMember[]>;
  getTeamMembersByStatus(status: string): Promise<InternalTeamMember[]>;
  
  // Team Structure methods (hierarchy, employment types)
  getTeamMembersBySupervisor(supervisorId: number): Promise<InternalTeamMember[]>;
  getTeamMembersByEmploymentType(employmentType: string): Promise<InternalTeamMember[]>;
  getTeamHierarchy(): Promise<InternalTeamMember[]>; // All members with supervisor info
  
  // Team Member Client Assignments methods
  getTeamMemberClientAssignments(memberId: number): Promise<TeamMemberClientAssignment[]>;
  getClientProfileAssignees(clientProfileId: number): Promise<TeamMemberClientAssignment[]>;
  getClientUserAssignees(clientUserId: string): Promise<TeamMemberClientAssignment[]>;
  createTeamMemberClientAssignment(assignment: InsertTeamMemberClientAssignment): Promise<TeamMemberClientAssignment>;
  updateTeamMemberClientAssignment(id: number, updates: Partial<InsertTeamMemberClientAssignment>): Promise<TeamMemberClientAssignment | undefined>;
  deleteTeamMemberClientAssignment(id: number): Promise<boolean>;
  
  // Team Payment History methods
  getTeamPaymentHistory(memberId: number): Promise<TeamPaymentHistory[]>;
  getAllTeamPayments(startDate?: Date, endDate?: Date): Promise<TeamPaymentHistory[]>;
  createTeamPayment(payment: InsertTeamPaymentHistory): Promise<TeamPaymentHistory>;
  updateTeamPayment(id: number, updates: Partial<InsertTeamPaymentHistory>): Promise<TeamPaymentHistory | undefined>;
  deleteTeamPayment(id: number): Promise<boolean>;
  
  // ==================== CONTENT IDEAS (PRE-PRODUCTION APPROVAL) ====================
  
  // Content Ideas methods
  getContentIdeas(): Promise<ContentIdea[]>;
  getContentIdea(id: number): Promise<ContentIdea | undefined>;
  getContentIdeasForClient(clientId: string): Promise<ContentIdea[]>;
  getContentIdeasByStatus(status: string): Promise<ContentIdea[]>;
  getPendingIdeasForClient(clientId: string): Promise<ContentIdea[]>;
  createContentIdea(idea: InsertContentIdea): Promise<ContentIdea>;
  updateContentIdea(id: number, updates: Partial<InsertContentIdea>): Promise<ContentIdea | undefined>;
  deleteContentIdea(id: number): Promise<boolean>;
  approveContentIdea(id: number, approvedBy: string, clientNotes?: string): Promise<ContentIdea | undefined>;
  denyContentIdea(id: number, deniedBy: string, clientNotes?: string): Promise<ContentIdea | undefined>;
  
  // Team Structure Template methods
  getTeamStructureTemplates(): Promise<TeamStructureTemplate[]>;
  getTeamStructureTemplate(id: number): Promise<TeamStructureTemplate | undefined>;
  getDefaultTeamStructureTemplate(): Promise<TeamStructureTemplate | undefined>;
  createTeamStructureTemplate(template: InsertTeamStructureTemplate): Promise<TeamStructureTemplate>;
  updateTeamStructureTemplate(id: number, updates: Partial<InsertTeamStructureTemplate>): Promise<TeamStructureTemplate | undefined>;
  deleteTeamStructureTemplate(id: number): Promise<boolean>;
  setDefaultTeamStructureTemplate(id: number): Promise<TeamStructureTemplate | undefined>;
  loadTeamStructureTemplate(id: number): Promise<InternalTeamMember[]>;
  
  // ==================== SAVED ITEMS (PINNED CONTENT) ====================
  
  getSavedItems(userId: string): Promise<SavedItem[]>;
  getSavedItem(id: number): Promise<SavedItem | undefined>;
  getSavedItemsByType(userId: string, itemType: string): Promise<SavedItem[]>;
  isItemSaved(userId: string, itemType: string, itemId: number): Promise<boolean>;
  createSavedItem(item: InsertSavedItem): Promise<SavedItem>;
  updateSavedItem(id: number, updates: Partial<InsertSavedItem>): Promise<SavedItem | undefined>;
  deleteSavedItem(id: number): Promise<boolean>;
  deleteSavedItemByTarget(userId: string, itemType: string, itemId: number): Promise<boolean>;
  
  // ==================== FEEDBACK SUBMISSIONS ====================
  
  getFeedbackSubmissions(targetType?: string, targetId?: number): Promise<FeedbackSubmission[]>;
  getFeedbackSubmission(id: number): Promise<FeedbackSubmission | undefined>;
  getFeedbackByUser(userId: string): Promise<FeedbackSubmission[]>;
  createFeedbackSubmission(feedback: InsertFeedbackSubmission): Promise<FeedbackSubmission>;
  respondToFeedback(id: number, respondedBy: string, responseText: string): Promise<FeedbackSubmission | undefined>;
  deleteFeedbackSubmission(id: number): Promise<boolean>;
  getFeedbackStats(targetType: string, targetId: number): Promise<{ avgRating: number; totalCount: number; byCategory: Record<string, number> }>;
  
  // ==================== YOUTUBE REFERENCES ====================
  
  getYoutubeReferences(targetType?: string, targetId?: number): Promise<YoutubeReference[]>;
  getYoutubeReference(id: number): Promise<YoutubeReference | undefined>;
  getYoutubeReferencesByStringTarget(targetType: string, targetStringId: string): Promise<YoutubeReference[]>;
  createYoutubeReference(reference: InsertYoutubeReference): Promise<YoutubeReference>;
  updateYoutubeReference(id: number, updates: Partial<InsertYoutubeReference>): Promise<YoutubeReference | undefined>;
  deleteYoutubeReference(id: number): Promise<boolean>;
  
  // ==================== BURNDOWN SNAPSHOTS ====================
  
  getBurndownSnapshots(campaignId?: number, startDate?: Date, endDate?: Date): Promise<BurndownSnapshot[]>;
  getBurndownSnapshot(id: number): Promise<BurndownSnapshot | undefined>;
  getLatestBurndownSnapshot(campaignId?: number): Promise<BurndownSnapshot | undefined>;
  createBurndownSnapshot(snapshot: InsertBurndownSnapshot): Promise<BurndownSnapshot>;
  generateBurndownSnapshot(campaignId?: number): Promise<BurndownSnapshot>;
  
  // ==================== LIBRARY ASSETS (ENHANCED) ====================
  
  getLibraryAssets(filters?: { category?: string; clientProfileId?: number; isPublic?: boolean; tags?: string[] }): Promise<LibraryAsset[]>;
  getLibraryAsset(id: number): Promise<LibraryAsset | undefined>;
  searchLibraryAssets(query: string): Promise<LibraryAsset[]>;
  createLibraryAsset(asset: InsertLibraryAsset): Promise<LibraryAsset>;
  updateLibraryAsset(id: number, updates: Partial<InsertLibraryAsset>): Promise<LibraryAsset | undefined>;
  deleteLibraryAsset(id: number): Promise<boolean>;
  incrementAssetUsage(id: number): Promise<LibraryAsset | undefined>;
  toggleAssetFavorite(id: number): Promise<LibraryAsset | undefined>;
  getAssetStats(): Promise<{ totalAssets: number; byCategory: Record<string, number>; totalSize: number; recentlyAdded: number }>;

  // ==================== DAO MANAGEMENT SYSTEM ====================

  // DAO Roles
  getDaoRoles(): Promise<DaoRole[]>;
  getDaoRole(id: number): Promise<DaoRole | undefined>;
  createDaoRole(role: InsertDaoRole): Promise<DaoRole>;
  updateDaoRole(id: number, updates: Partial<InsertDaoRole>): Promise<DaoRole | undefined>;

  // DAO Memberships
  getDaoMemberships(): Promise<DaoMembership[]>;
  getDaoMembership(id: number): Promise<DaoMembership | undefined>;
  getDaoMembershipByUserId(userId: string): Promise<DaoMembership | undefined>;
  getDaoMembershipByTeamMemberId(teamMemberId: number): Promise<DaoMembership | undefined>;
  getCouncilMembers(): Promise<DaoMembership[]>;
  createDaoMembership(membership: InsertDaoMembership): Promise<DaoMembership>;
  updateDaoMembership(id: number, updates: Partial<InsertDaoMembership>): Promise<DaoMembership | undefined>;
  updateMemberCumulativeRevenue(id: number, amount: number): Promise<DaoMembership | undefined>;

  // DAO Service Catalog
  getDaoServiceCatalog(activeOnly?: boolean): Promise<DaoServiceCatalog[]>;
  getDaoService(id: number): Promise<DaoServiceCatalog | undefined>;
  getDaoServicesByCategory(category: string): Promise<DaoServiceCatalog[]>;
  createDaoService(service: InsertDaoServiceCatalog): Promise<DaoServiceCatalog>;
  updateDaoService(id: number, updates: Partial<InsertDaoServiceCatalog>): Promise<DaoServiceCatalog | undefined>;
  deleteDaoService(id: number): Promise<boolean>;

  // DAO Discounts
  getDaoDiscounts(activeOnly?: boolean): Promise<DaoDiscount[]>;
  getDaoDiscount(id: number): Promise<DaoDiscount | undefined>;
  createDaoDiscount(discount: InsertDaoDiscount): Promise<DaoDiscount>;
  updateDaoDiscount(id: number, updates: Partial<InsertDaoDiscount>): Promise<DaoDiscount | undefined>;
  deleteDaoDiscount(id: number): Promise<boolean>;

  // DAO Projects
  getDaoProjects(filters?: { status?: string; clientProfileId?: number }): Promise<DaoProject[]>;
  getDaoProject(id: number): Promise<DaoProject | undefined>;
  createDaoProject(project: InsertDaoProject): Promise<DaoProject>;
  updateDaoProject(id: number, updates: Partial<InsertDaoProject>): Promise<DaoProject | undefined>;
  deleteDaoProject(id: number): Promise<boolean>;

  // DAO Project Services
  getDaoProjectServices(projectId: number): Promise<DaoProjectService[]>;
  createDaoProjectService(service: InsertDaoProjectService): Promise<DaoProjectService>;
  updateDaoProjectService(id: number, updates: Partial<InsertDaoProjectService>): Promise<DaoProjectService | undefined>;
  deleteDaoProjectService(id: number): Promise<boolean>;

  // DAO Revenue Attributions
  getDaoRevenueAttributions(projectId: number): Promise<DaoRevenueAttribution[]>;
  getDaoRevenueAttributionsByMember(membershipId: number): Promise<DaoRevenueAttribution[]>;
  createDaoRevenueAttribution(attribution: InsertDaoRevenueAttribution): Promise<DaoRevenueAttribution>;
  updateDaoRevenueAttribution(id: number, updates: Partial<InsertDaoRevenueAttribution>): Promise<DaoRevenueAttribution | undefined>;
  approveDaoRevenueAttribution(id: number, approvedBy: string): Promise<DaoRevenueAttribution | undefined>;
  applyDefaultAttributionTemplate(projectId: number, leadId: number, pmId: number, coreContributors: number[], supportContributors: number[]): Promise<DaoRevenueAttribution[]>;

  // DAO Debriefs
  getDaoDebriefs(projectId?: number): Promise<DaoDebrief[]>;
  getDaoDebrief(id: number): Promise<DaoDebrief | undefined>;
  createDaoDebrief(debrief: InsertDaoDebrief): Promise<DaoDebrief>;
  updateDaoDebrief(id: number, updates: Partial<InsertDaoDebrief>): Promise<DaoDebrief | undefined>;

  // DAO Treasury
  getDaoTreasury(): Promise<DaoTreasury | undefined>;
  initializeDaoTreasury(): Promise<DaoTreasury>;
  updateDaoTreasuryBalance(amount: number): Promise<DaoTreasury | undefined>;

  // DAO Treasury Transactions
  getDaoTreasuryTransactions(limit?: number): Promise<DaoTreasuryTransaction[]>;
  createDaoTreasuryTransaction(txn: InsertDaoTreasuryTransaction): Promise<DaoTreasuryTransaction>;
  recordProjectTreasuryContribution(projectId: number, amount: number, createdBy: string): Promise<DaoTreasuryTransaction>;

  // DAO Bonus Runs
  getDaoBonusRuns(): Promise<DaoBonusRun[]>;
  getDaoBonusRun(id: number): Promise<DaoBonusRun | undefined>;
  createDaoBonusRun(run: InsertDaoBonusRun): Promise<DaoBonusRun>;
  getDaoBonusRunRecipients(bonusRunId: number): Promise<DaoBonusRunRecipient[]>;
  createDaoBonusRunRecipient(recipient: InsertDaoBonusRunRecipient): Promise<DaoBonusRunRecipient>;
  simulateBonusDistribution(): Promise<{ members: { membershipId: number; multiplier: number; share: number }[]; totalToDistribute: number; eligible: boolean }>;
  executeBonusDistribution(triggeredBy: string): Promise<DaoBonusRun | undefined>;

  // DAO Invoices
  getDaoInvoices(projectId?: number): Promise<DaoInvoice[]>;
  getDaoInvoice(id: number): Promise<DaoInvoice | undefined>;
  createDaoInvoice(invoice: InsertDaoInvoice): Promise<DaoInvoice>;
  updateDaoInvoice(id: number, updates: Partial<InsertDaoInvoice>): Promise<DaoInvoice | undefined>;
  markDaoInvoicePaid(id: number, paymentMethod: string, paymentReference?: string): Promise<DaoInvoice | undefined>;
  generateProjectInvoices(projectId: number, createdBy: string): Promise<DaoInvoice[]>;

  // DAO Rank Progressions
  getDaoRankProgressions(membershipId?: number): Promise<DaoRankProgression[]>;
  createDaoRankProgression(progression: InsertDaoRankProgression): Promise<DaoRankProgression>;
  checkAndPromoteMember(membershipId: number, approvedBy?: string): Promise<DaoRankProgression | undefined>;

  // DAO Project Links
  getDaoProjectLinks(projectId: number): Promise<DaoProjectLink[]>;
  createDaoProjectLink(link: InsertDaoProjectLink): Promise<DaoProjectLink>;
  deleteDaoProjectLink(id: number): Promise<boolean>;

  // DAO Permissions
  getDaoPermissions(membershipId: number): Promise<DaoPermission[]>;
  getDaoPermissionByScope(membershipId: number, scope: string): Promise<DaoPermission | undefined>;
  createDaoPermission(permission: InsertDaoPermission): Promise<DaoPermission>;
  updateDaoPermission(id: number, updates: Partial<InsertDaoPermission>): Promise<DaoPermission | undefined>;
  hasCouncilPermission(membershipId: number, scope: string): Promise<boolean>;

  // Safe Wallet methods
  getDaoSafeWallets(): Promise<DaoSafeWallet[]>;
  getDaoSafeWallet(id: number): Promise<DaoSafeWallet | undefined>;
  getDaoSafeWalletByAddress(address: string, chainId: number): Promise<DaoSafeWallet | undefined>;
  createDaoSafeWallet(wallet: InsertDaoSafeWallet): Promise<DaoSafeWallet>;
  updateDaoSafeWallet(id: number, updates: Partial<InsertDaoSafeWallet>): Promise<DaoSafeWallet | undefined>;
  deleteDaoSafeWallet(id: number): Promise<boolean>;
  getDaoSafeBalances(walletId: number): Promise<DaoSafeBalance[]>;
  upsertDaoSafeBalances(walletId: number, balances: InsertDaoSafeBalance[]): Promise<DaoSafeBalance[]>;
  getDaoSafePendingTxs(walletId?: number): Promise<DaoSafePendingTx[]>;
  upsertDaoSafePendingTx(tx: InsertDaoSafePendingTx): Promise<DaoSafePendingTx>;
  deleteDaoSafePendingTx(id: number): Promise<boolean>;
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

  async getApprovalsByReviewer(reviewerId: string): Promise<Approval[]> {
    return await db.select().from(approvals).where(eq(approvals.reviewerId, reviewerId)).orderBy(desc(approvals.createdAt));
  }

  async getPendingApprovals(reviewerId: string): Promise<Approval[]> {
    return await db
      .select()
      .from(approvals)
      .where(and(eq(approvals.reviewerId, reviewerId), eq(approvals.status, "pending")))
      .orderBy(approvals.stage, desc(approvals.createdAt));
  }

  // Approval Workflow methods
  async getApprovalWorkflows(): Promise<ApprovalWorkflow[]> {
    return await db.select().from(approvalWorkflows).where(eq(approvalWorkflows.isActive, true)).orderBy(approvalWorkflows.name);
  }

  async getApprovalWorkflow(id: number): Promise<ApprovalWorkflow | undefined> {
    const [workflow] = await db.select().from(approvalWorkflows).where(eq(approvalWorkflows.id, id));
    return workflow;
  }

  async getApprovalWorkflowByContentType(contentType: string): Promise<ApprovalWorkflow | undefined> {
    const [workflow] = await db
      .select()
      .from(approvalWorkflows)
      .where(and(eq(approvalWorkflows.contentType, contentType), eq(approvalWorkflows.isActive, true)));
    return workflow;
  }

  async createApprovalWorkflow(workflow: InsertApprovalWorkflow): Promise<ApprovalWorkflow> {
    const [created] = await db.insert(approvalWorkflows).values(workflow).returning();
    return created;
  }

  async updateApprovalWorkflow(id: number, workflow: Partial<InsertApprovalWorkflow>): Promise<ApprovalWorkflow | undefined> {
    const [updated] = await db
      .update(approvalWorkflows)
      .set({ ...workflow, updatedAt: new Date() })
      .where(eq(approvalWorkflows.id, id))
      .returning();
    return updated;
  }

  async deleteApprovalWorkflow(id: number): Promise<boolean> {
    const result = await db.delete(approvalWorkflows).where(eq(approvalWorkflows.id, id)).returning();
    return result.length > 0;
  }

  // Approval Workflow Stage methods
  async getApprovalWorkflowStages(workflowId: number): Promise<ApprovalWorkflowStage[]> {
    return await db.select().from(approvalWorkflowStages).where(eq(approvalWorkflowStages.workflowId, workflowId)).orderBy(approvalWorkflowStages.stageOrder);
  }

  async createApprovalWorkflowStage(stage: InsertApprovalWorkflowStage): Promise<ApprovalWorkflowStage> {
    const [created] = await db.insert(approvalWorkflowStages).values(stage).returning();
    return created;
  }

  async updateApprovalWorkflowStage(id: number, stage: Partial<InsertApprovalWorkflowStage>): Promise<ApprovalWorkflowStage | undefined> {
    const [updated] = await db.update(approvalWorkflowStages).set(stage).where(eq(approvalWorkflowStages.id, id)).returning();
    return updated;
  }

  async deleteApprovalWorkflowStage(id: number): Promise<boolean> {
    const result = await db.delete(approvalWorkflowStages).where(eq(approvalWorkflowStages.id, id)).returning();
    return result.length > 0;
  }

  async applyWorkflowToTask(taskId: number, workflowId: number): Promise<Approval[]> {
    const stages = await this.getApprovalWorkflowStages(workflowId);
    const createdApprovals: Approval[] = [];
    const skippedStages: string[] = [];
    
    // Get all users to assign based on role
    const allUsers = await this.getAllUsers();
    
    for (const stage of stages) {
      let reviewerId = stage.reviewerId;
      
      // If no specific reviewer but has a role requirement, find an appropriate user
      if (!reviewerId && stage.reviewerRole) {
        const roleUsers = allUsers.filter(u => u.role === stage.reviewerRole);
        if (roleUsers.length > 0) {
          // Assign to first available user with that role (could be randomized or round-robin in future)
          reviewerId = roleUsers[0].id;
        }
      }
      
      // Create approval if we have a reviewer
      if (reviewerId) {
        const dueDate = stage.daysToComplete 
          ? new Date(Date.now() + stage.daysToComplete * 24 * 60 * 60 * 1000)
          : undefined;
          
        const approval = await this.createApproval({
          taskId,
          reviewerId,
          status: "pending",
          stage: stage.stageOrder,
          stageName: stage.stageName,
          isRequired: stage.isRequired,
          dueDate,
        });
        createdApprovals.push(approval);
      } else if (stage.isRequired) {
        // Track required stages that couldn't be assigned
        skippedStages.push(`${stage.stageName} (requires ${stage.reviewerRole || 'specific'} reviewer)`);
      }
    }
    
    // Log warning if required stages were skipped
    if (skippedStages.length > 0) {
      console.warn(`Workflow ${workflowId} applied to task ${taskId} but skipped required stages: ${skippedStages.join(', ')}`);
    }
    
    return createdApprovals;
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
  
  // ==================== DISCORD INTEGRATION METHODS ====================
  
  async getDiscordConnection(userId: string): Promise<DiscordConnection | undefined> {
    const [connection] = await db
      .select()
      .from(discordConnections)
      .where(eq(discordConnections.userId, userId));
    return connection;
  }
  
  async getDiscordConnectionByDiscordId(discordUserId: string): Promise<DiscordConnection | undefined> {
    const [connection] = await db
      .select()
      .from(discordConnections)
      .where(eq(discordConnections.discordUserId, discordUserId));
    return connection;
  }
  
  async getAllDiscordConnections(): Promise<DiscordConnection[]> {
    return await db.select().from(discordConnections);
  }
  
  async createDiscordConnection(connection: InsertDiscordConnection): Promise<DiscordConnection> {
    const [created] = await db.insert(discordConnections).values(connection).returning();
    return created;
  }
  
  async updateDiscordConnection(userId: string, updates: Partial<InsertDiscordConnection>): Promise<DiscordConnection | undefined> {
    const [updated] = await db
      .update(discordConnections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(discordConnections.userId, userId))
      .returning();
    return updated;
  }
  
  async deleteDiscordConnection(userId: string): Promise<boolean> {
    const result = await db.delete(discordConnections).where(eq(discordConnections.userId, userId));
    return result.rowCount > 0;
  }
  
  // Discord Presence Session methods
  async getActivePresenceSessions(): Promise<DiscordPresenceSession[]> {
    return await db
      .select()
      .from(discordPresenceSessions)
      .where(isNull(discordPresenceSessions.endedAt))
      .orderBy(desc(discordPresenceSessions.startedAt));
  }
  
  async getPresenceSession(userId: string): Promise<DiscordPresenceSession | undefined> {
    const [session] = await db
      .select()
      .from(discordPresenceSessions)
      .where(and(
        eq(discordPresenceSessions.userId, userId),
        isNull(discordPresenceSessions.endedAt)
      ));
    return session;
  }
  
  async getActivePresenceByDiscordId(discordUserId: string): Promise<DiscordPresenceSession | undefined> {
    const [session] = await db
      .select()
      .from(discordPresenceSessions)
      .where(and(
        eq(discordPresenceSessions.discordUserId, discordUserId),
        isNull(discordPresenceSessions.endedAt)
      ));
    return session;
  }
  
  async createPresenceSession(session: InsertDiscordPresenceSession): Promise<DiscordPresenceSession> {
    const [created] = await db.insert(discordPresenceSessions).values(session).returning();
    return created;
  }
  
  async updatePresenceSession(id: number, updates: Partial<DiscordPresenceSession>): Promise<DiscordPresenceSession | undefined> {
    const [updated] = await db
      .update(discordPresenceSessions)
      .set(updates)
      .where(eq(discordPresenceSessions.id, id))
      .returning();
    return updated;
  }
  
  async endPresenceSession(discordUserId: string): Promise<DiscordPresenceSession | undefined> {
    const [ended] = await db
      .update(discordPresenceSessions)
      .set({ endedAt: new Date() })
      .where(and(
        eq(discordPresenceSessions.discordUserId, discordUserId),
        isNull(discordPresenceSessions.endedAt)
      ))
      .returning();
    return ended;
  }
  
  async getUserPresenceHistory(userId: string, limit: number = 50): Promise<DiscordPresenceSession[]> {
    return await db
      .select()
      .from(discordPresenceSessions)
      .where(eq(discordPresenceSessions.userId, userId))
      .orderBy(desc(discordPresenceSessions.startedAt))
      .limit(limit);
  }
  
  // Discord Settings methods
  async getDiscordSettings(): Promise<DiscordSettings | undefined> {
    const [settings] = await db.select().from(discordSettings).limit(1);
    return settings;
  }
  
  async createDiscordSettings(settings: InsertDiscordSettings): Promise<DiscordSettings> {
    const [created] = await db.insert(discordSettings).values(settings).returning();
    return created;
  }
  
  async updateDiscordSettings(id: number, updates: Partial<InsertDiscordSettings>): Promise<DiscordSettings | undefined> {
    const [updated] = await db
      .update(discordSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(discordSettings.id, id))
      .returning();
    return updated;
  }
  
  async updateBotHeartbeat(): Promise<void> {
    await db
      .update(discordSettings)
      .set({ lastBotHeartbeat: new Date(), botConnected: true });
  }
  
  // ==================== ORDER TEMPLATES METHODS ====================
  
  async getOrderTemplates(activeOnly: boolean = false): Promise<OrderTemplate[]> {
    if (activeOnly) {
      return await db
        .select()
        .from(orderTemplates)
        .where(eq(orderTemplates.isActive, true))
        .orderBy(orderTemplates.sortOrder);
    }
    return await db
      .select()
      .from(orderTemplates)
      .orderBy(orderTemplates.sortOrder);
  }
  
  async getOrderTemplate(id: number): Promise<OrderTemplate | undefined> {
    const [template] = await db
      .select()
      .from(orderTemplates)
      .where(eq(orderTemplates.id, id));
    return template;
  }
  
  async createOrderTemplate(template: InsertOrderTemplate): Promise<OrderTemplate> {
    const [created] = await db.insert(orderTemplates).values(template).returning();
    return created;
  }
  
  async updateOrderTemplate(id: number, updates: Partial<InsertOrderTemplate>): Promise<OrderTemplate | undefined> {
    const [updated] = await db
      .update(orderTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orderTemplates.id, id))
      .returning();
    return updated;
  }
  
  async deleteOrderTemplate(id: number): Promise<boolean> {
    const result = await db.delete(orderTemplates).where(eq(orderTemplates.id, id));
    return true;
  }
  
  // Saved Orders methods
  async getSavedOrders(clientId: string): Promise<SavedOrder[]> {
    return await db
      .select()
      .from(savedOrders)
      .where(eq(savedOrders.clientId, clientId))
      .orderBy(desc(savedOrders.lastUsedAt));
  }
  
  async getSavedOrder(id: number): Promise<SavedOrder | undefined> {
    const [order] = await db
      .select()
      .from(savedOrders)
      .where(eq(savedOrders.id, id));
    return order;
  }
  
  async createSavedOrder(order: InsertSavedOrder): Promise<SavedOrder> {
    const [created] = await db.insert(savedOrders).values(order).returning();
    return created;
  }
  
  async updateSavedOrder(id: number, updates: Partial<InsertSavedOrder>): Promise<SavedOrder | undefined> {
    const [updated] = await db
      .update(savedOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(savedOrders.id, id))
      .returning();
    return updated;
  }
  
  async deleteSavedOrder(id: number): Promise<boolean> {
    await db.delete(savedOrders).where(eq(savedOrders.id, id));
    return true;
  }
  
  async incrementSavedOrderUsage(id: number): Promise<SavedOrder | undefined> {
    const order = await this.getSavedOrder(id);
    if (!order) return undefined;
    
    const [updated] = await db
      .update(savedOrders)
      .set({ 
        usageCount: (order.usageCount || 0) + 1,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(savedOrders.id, id))
      .returning();
    return updated;
  }

  // ==================== TASK MESSAGES METHODS ====================

  async getTaskMessages(taskId?: number, orderId?: number, includeInternal: boolean = false): Promise<TaskMessage[]> {
    const conditions = [];
    
    if (taskId !== undefined) {
      conditions.push(eq(taskMessages.taskId, taskId));
    }
    if (orderId !== undefined) {
      conditions.push(eq(taskMessages.orderId, orderId));
    }
    if (!includeInternal) {
      conditions.push(eq(taskMessages.isInternal, false));
    }
    
    if (conditions.length === 0) {
      return [];
    }
    
    return await db
      .select()
      .from(taskMessages)
      .where(and(...conditions))
      .orderBy(taskMessages.createdAt);
  }

  async getTaskMessage(id: number): Promise<TaskMessage | undefined> {
    const [message] = await db
      .select()
      .from(taskMessages)
      .where(eq(taskMessages.id, id));
    return message;
  }

  async createTaskMessage(message: InsertTaskMessage): Promise<TaskMessage> {
    const [created] = await db.insert(taskMessages).values(message).returning();
    return created;
  }

  async markMessageReadByClient(id: number): Promise<TaskMessage | undefined> {
    const [updated] = await db
      .update(taskMessages)
      .set({ readByClient: true })
      .where(eq(taskMessages.id, id))
      .returning();
    return updated;
  }

  async markMessageReadByTeam(id: number): Promise<TaskMessage | undefined> {
    const [updated] = await db
      .update(taskMessages)
      .set({ readByTeam: true })
      .where(eq(taskMessages.id, id))
      .returning();
    return updated;
  }

  async markAllMessagesReadByClient(orderId: number): Promise<void> {
    await db
      .update(taskMessages)
      .set({ readByClient: true })
      .where(and(
        eq(taskMessages.orderId, orderId),
        eq(taskMessages.readByClient, false)
      ));
  }

  async markAllMessagesReadByTeam(orderId: number): Promise<void> {
    await db
      .update(taskMessages)
      .set({ readByTeam: true })
      .where(and(
        eq(taskMessages.orderId, orderId),
        eq(taskMessages.readByTeam, false)
      ));
  }

  async getUnreadClientMessageCount(orderId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskMessages)
      .where(and(
        eq(taskMessages.orderId, orderId),
        eq(taskMessages.readByClient, false),
        eq(taskMessages.isInternal, false),
        eq(taskMessages.senderRole, "content")
      ));
    return Number(result[0]?.count || 0);
  }

  async getUnreadTeamMessageCount(orderId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskMessages)
      .where(and(
        eq(taskMessages.orderId, orderId),
        eq(taskMessages.readByTeam, false),
        eq(taskMessages.senderRole, "content")
      ));
    return Number(result[0]?.count || 0);
  }

  // ==================== DELIVERABLE ANNOTATIONS METHODS ====================

  async getDeliverableAnnotations(deliverableId: number, versionId?: number): Promise<DeliverableAnnotation[]> {
    if (versionId !== undefined) {
      return await db
        .select()
        .from(deliverableAnnotations)
        .where(and(
          eq(deliverableAnnotations.deliverableId, deliverableId),
          eq(deliverableAnnotations.versionId, versionId)
        ))
        .orderBy(deliverableAnnotations.createdAt);
    }
    return await db
      .select()
      .from(deliverableAnnotations)
      .where(eq(deliverableAnnotations.deliverableId, deliverableId))
      .orderBy(deliverableAnnotations.createdAt);
  }

  async getDeliverableAnnotation(id: number): Promise<DeliverableAnnotation | undefined> {
    const [annotation] = await db
      .select()
      .from(deliverableAnnotations)
      .where(eq(deliverableAnnotations.id, id));
    return annotation;
  }

  async createDeliverableAnnotation(annotation: InsertDeliverableAnnotation): Promise<DeliverableAnnotation> {
    const [created] = await db.insert(deliverableAnnotations).values(annotation).returning();
    return created;
  }

  async updateDeliverableAnnotation(id: number, updates: Partial<InsertDeliverableAnnotation>): Promise<DeliverableAnnotation | undefined> {
    const [updated] = await db
      .update(deliverableAnnotations)
      .set(updates)
      .where(eq(deliverableAnnotations.id, id))
      .returning();
    return updated;
  }

  async resolveDeliverableAnnotation(id: number, resolvedBy: string): Promise<DeliverableAnnotation | undefined> {
    const [updated] = await db
      .update(deliverableAnnotations)
      .set({ 
        status: "resolved", 
        resolvedBy,
        resolvedAt: new Date()
      })
      .where(eq(deliverableAnnotations.id, id))
      .returning();
    return updated;
  }

  async deleteDeliverableAnnotation(id: number): Promise<boolean> {
    await db.delete(deliverableAnnotations).where(eq(deliverableAnnotations.id, id));
    return true;
  }

  // ==================== CLIENT PROFILE METHODS ====================

  async getClientProfiles(): Promise<ClientProfile[]> {
    return await db
      .select()
      .from(clientProfiles)
      .orderBy(clientProfiles.name);
  }

  async getClientProfile(id: number): Promise<ClientProfile | undefined> {
    const [profile] = await db
      .select()
      .from(clientProfiles)
      .where(eq(clientProfiles.id, id));
    return profile;
  }

  async getClientProfileBySlug(slug: string): Promise<ClientProfile | undefined> {
    const [profile] = await db
      .select()
      .from(clientProfiles)
      .where(eq(clientProfiles.slug, slug));
    return profile;
  }

  async createClientProfile(profile: InsertClientProfile): Promise<ClientProfile> {
    const [created] = await db.insert(clientProfiles).values(profile).returning();
    return created;
  }

  async updateClientProfile(id: number, profile: Partial<InsertClientProfile>): Promise<ClientProfile | undefined> {
    const [updated] = await db
      .update(clientProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(clientProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteClientProfile(id: number): Promise<boolean> {
    await db.delete(clientProfiles).where(eq(clientProfiles.id, id));
    return true;
  }

  async searchClientProfiles(query: string): Promise<ClientProfile[]> {
    const lowercaseQuery = `%${query.toLowerCase()}%`;
    return await db
      .select()
      .from(clientProfiles)
      .where(
        or(
          sql`LOWER(${clientProfiles.name}) LIKE ${lowercaseQuery}`,
          sql`LOWER(${clientProfiles.description}) LIKE ${lowercaseQuery}`,
          sql`LOWER(${clientProfiles.industry}) LIKE ${lowercaseQuery}`
        )
      )
      .orderBy(clientProfiles.name);
  }

  // ==================== CLIENT CALENDAR EVENT METHODS ====================

  async getClientCalendarEvents(clientProfileId: number): Promise<ClientCalendarEvent[]> {
    return await db
      .select()
      .from(clientCalendarEvents)
      .where(eq(clientCalendarEvents.clientProfileId, clientProfileId))
      .orderBy(clientCalendarEvents.startDate);
  }

  async getClientCalendarEvent(id: number): Promise<ClientCalendarEvent | undefined> {
    const [event] = await db
      .select()
      .from(clientCalendarEvents)
      .where(eq(clientCalendarEvents.id, id));
    return event;
  }

  async getAllCalendarEvents(startDate?: Date, endDate?: Date): Promise<ClientCalendarEvent[]> {
    let query = db.select().from(clientCalendarEvents);
    
    if (startDate && endDate) {
      return await db
        .select()
        .from(clientCalendarEvents)
        .where(
          and(
            sql`${clientCalendarEvents.startDate} >= ${startDate}`,
            sql`${clientCalendarEvents.startDate} <= ${endDate}`
          )
        )
        .orderBy(clientCalendarEvents.startDate);
    }
    
    return await db
      .select()
      .from(clientCalendarEvents)
      .orderBy(clientCalendarEvents.startDate);
  }

  async createClientCalendarEvent(event: InsertClientCalendarEvent): Promise<ClientCalendarEvent> {
    const [created] = await db.insert(clientCalendarEvents).values(event).returning();
    return created;
  }

  async updateClientCalendarEvent(id: number, event: Partial<InsertClientCalendarEvent>): Promise<ClientCalendarEvent | undefined> {
    const [updated] = await db
      .update(clientCalendarEvents)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(clientCalendarEvents.id, id))
      .returning();
    return updated;
  }

  async deleteClientCalendarEvent(id: number): Promise<boolean> {
    await db.delete(clientCalendarEvents).where(eq(clientCalendarEvents.id, id));
    return true;
  }

  async getCalendarEventsByGoogleId(googleEventId: string): Promise<ClientCalendarEvent | undefined> {
    const [event] = await db
      .select()
      .from(clientCalendarEvents)
      .where(eq(clientCalendarEvents.googleCalendarEventId, googleEventId));
    return event;
  }

  async updateCalendarEventSyncStatus(id: number, status: string, googleEventId?: string): Promise<ClientCalendarEvent | undefined> {
    const updates: Record<string, unknown> = { 
      syncStatus: status, 
      lastSyncedAt: new Date(),
      updatedAt: new Date()
    };
    if (googleEventId) {
      updates.googleCalendarEventId = googleEventId;
    }
    const [updated] = await db
      .update(clientCalendarEvents)
      .set(updates)
      .where(eq(clientCalendarEvents.id, id))
      .returning();
    return updated;
  }

  // ==================== CLIENT TASK LINK METHODS ====================

  async linkTaskToClient(clientProfileId: number, taskId?: number, orderId?: number): Promise<ClientTaskLink> {
    const [link] = await db.insert(clientTaskLinks).values({
      clientProfileId,
      taskId: taskId || null,
      orderId: orderId || null,
    }).returning();
    return link;
  }

  async getClientTaskLinks(clientProfileId: number): Promise<ClientTaskLink[]> {
    return await db
      .select()
      .from(clientTaskLinks)
      .where(eq(clientTaskLinks.clientProfileId, clientProfileId));
  }

  async getClientForTask(taskId: number): Promise<ClientProfile | undefined> {
    const [result] = await db
      .select({ profile: clientProfiles })
      .from(clientTaskLinks)
      .innerJoin(clientProfiles, eq(clientTaskLinks.clientProfileId, clientProfiles.id))
      .where(eq(clientTaskLinks.taskId, taskId));
    return result?.profile;
  }

  async getClientForOrder(orderId: number): Promise<ClientProfile | undefined> {
    const [result] = await db
      .select({ profile: clientProfiles })
      .from(clientTaskLinks)
      .innerJoin(clientProfiles, eq(clientTaskLinks.clientProfileId, clientProfiles.id))
      .where(eq(clientTaskLinks.orderId, orderId));
    return result?.profile;
  }

  async unlinkTaskFromClient(id: number): Promise<boolean> {
    await db.delete(clientTaskLinks).where(eq(clientTaskLinks.id, id));
    return true;
  }

  // ==================== INTERNAL TEAM MEMBERS METHODS ====================

  async getInternalTeamMembers(): Promise<InternalTeamMember[]> {
    return await db
      .select()
      .from(internalTeamMembers)
      .orderBy(internalTeamMembers.name);
  }

  async getInternalTeamMember(id: number): Promise<InternalTeamMember | undefined> {
    const [member] = await db
      .select()
      .from(internalTeamMembers)
      .where(eq(internalTeamMembers.id, id));
    return member;
  }

  async getInternalTeamMemberByName(name: string): Promise<InternalTeamMember | undefined> {
    const [member] = await db
      .select()
      .from(internalTeamMembers)
      .where(eq(internalTeamMembers.name, name));
    return member;
  }

  async createInternalTeamMember(member: InsertInternalTeamMember): Promise<InternalTeamMember> {
    const [created] = await db.insert(internalTeamMembers).values(member).returning();
    return created;
  }

  async updateInternalTeamMember(id: number, updates: Partial<InsertInternalTeamMember>): Promise<InternalTeamMember | undefined> {
    const [updated] = await db
      .update(internalTeamMembers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(internalTeamMembers.id, id))
      .returning();
    return updated;
  }

  async deleteInternalTeamMember(id: number): Promise<boolean> {
    await db.delete(internalTeamMembers).where(eq(internalTeamMembers.id, id));
    return true;
  }

  async searchInternalTeamMembers(query: string): Promise<InternalTeamMember[]> {
    const searchPattern = `%${query.toLowerCase()}%`;
    return await db
      .select()
      .from(internalTeamMembers)
      .where(
        or(
          sql`LOWER(${internalTeamMembers.name}) LIKE ${searchPattern}`,
          sql`LOWER(${internalTeamMembers.nickname}) LIKE ${searchPattern}`,
          sql`LOWER(${internalTeamMembers.role}) LIKE ${searchPattern}`
        )
      )
      .orderBy(internalTeamMembers.name);
  }

  async getTeamMembersByDepartment(department: string): Promise<InternalTeamMember[]> {
    return await db
      .select()
      .from(internalTeamMembers)
      .where(eq(internalTeamMembers.department, department))
      .orderBy(internalTeamMembers.name);
  }

  async getTeamMembersByStatus(status: string): Promise<InternalTeamMember[]> {
    return await db
      .select()
      .from(internalTeamMembers)
      .where(eq(internalTeamMembers.status, status))
      .orderBy(internalTeamMembers.name);
  }

  // ==================== TEAM STRUCTURE METHODS ====================

  async getTeamMembersBySupervisor(supervisorId: number): Promise<InternalTeamMember[]> {
    return await db
      .select()
      .from(internalTeamMembers)
      .where(eq(internalTeamMembers.supervisorId, supervisorId))
      .orderBy(internalTeamMembers.name);
  }

  async getTeamMembersByEmploymentType(employmentType: string): Promise<InternalTeamMember[]> {
    return await db
      .select()
      .from(internalTeamMembers)
      .where(eq(internalTeamMembers.employmentType, employmentType))
      .orderBy(internalTeamMembers.name);
  }

  async getTeamHierarchy(): Promise<InternalTeamMember[]> {
    return await db
      .select()
      .from(internalTeamMembers)
      .orderBy(internalTeamMembers.name);
  }

  // ==================== TEAM MEMBER CLIENT ASSIGNMENTS METHODS ====================

  async getTeamMemberClientAssignments(memberId: number): Promise<TeamMemberClientAssignment[]> {
    return await db
      .select()
      .from(teamMemberClientAssignments)
      .where(eq(teamMemberClientAssignments.memberId, memberId));
  }

  async getClientProfileAssignees(clientProfileId: number): Promise<TeamMemberClientAssignment[]> {
    return await db
      .select()
      .from(teamMemberClientAssignments)
      .where(eq(teamMemberClientAssignments.clientProfileId, clientProfileId));
  }

  async getClientUserAssignees(clientUserId: string): Promise<TeamMemberClientAssignment[]> {
    return await db
      .select()
      .from(teamMemberClientAssignments)
      .where(eq(teamMemberClientAssignments.clientUserId, clientUserId));
  }

  async createTeamMemberClientAssignment(assignment: InsertTeamMemberClientAssignment): Promise<TeamMemberClientAssignment> {
    const [created] = await db.insert(teamMemberClientAssignments).values(assignment).returning();
    return created;
  }

  async updateTeamMemberClientAssignment(id: number, updates: Partial<InsertTeamMemberClientAssignment>): Promise<TeamMemberClientAssignment | undefined> {
    const [updated] = await db
      .update(teamMemberClientAssignments)
      .set(updates)
      .where(eq(teamMemberClientAssignments.id, id))
      .returning();
    return updated;
  }

  async deleteTeamMemberClientAssignment(id: number): Promise<boolean> {
    await db.delete(teamMemberClientAssignments).where(eq(teamMemberClientAssignments.id, id));
    return true;
  }

  // ==================== TEAM PAYMENT HISTORY METHODS ====================

  async getTeamPaymentHistory(memberId: number): Promise<TeamPaymentHistory[]> {
    return await db
      .select()
      .from(teamPaymentHistory)
      .where(eq(teamPaymentHistory.memberId, memberId))
      .orderBy(desc(teamPaymentHistory.paymentDate));
  }

  async getAllTeamPayments(startDate?: Date, endDate?: Date): Promise<TeamPaymentHistory[]> {
    if (startDate && endDate) {
      return await db
        .select()
        .from(teamPaymentHistory)
        .where(
          and(
            sql`${teamPaymentHistory.paymentDate} >= ${startDate}`,
            sql`${teamPaymentHistory.paymentDate} <= ${endDate}`
          )
        )
        .orderBy(desc(teamPaymentHistory.paymentDate));
    }
    return await db
      .select()
      .from(teamPaymentHistory)
      .orderBy(desc(teamPaymentHistory.paymentDate));
  }

  async createTeamPayment(payment: InsertTeamPaymentHistory): Promise<TeamPaymentHistory> {
    const [created] = await db.insert(teamPaymentHistory).values(payment).returning();
    return created;
  }

  async updateTeamPayment(id: number, updates: Partial<InsertTeamPaymentHistory>): Promise<TeamPaymentHistory | undefined> {
    const [updated] = await db
      .update(teamPaymentHistory)
      .set(updates)
      .where(eq(teamPaymentHistory.id, id))
      .returning();
    return updated;
  }

  async deleteTeamPayment(id: number): Promise<boolean> {
    await db.delete(teamPaymentHistory).where(eq(teamPaymentHistory.id, id));
    return true;
  }

  // ==================== CONTENT IDEAS (PRE-PRODUCTION APPROVAL) METHODS ====================

  async getContentIdeas(): Promise<ContentIdea[]> {
    return await db
      .select()
      .from(contentIdeas)
      .orderBy(desc(contentIdeas.createdAt));
  }

  async getContentIdea(id: number): Promise<ContentIdea | undefined> {
    const [idea] = await db
      .select()
      .from(contentIdeas)
      .where(eq(contentIdeas.id, id));
    return idea;
  }

  async getContentIdeasForClient(clientId: string): Promise<ContentIdea[]> {
    return await db
      .select()
      .from(contentIdeas)
      .where(eq(contentIdeas.clientId, clientId))
      .orderBy(desc(contentIdeas.createdAt));
  }

  async getContentIdeasByStatus(status: string): Promise<ContentIdea[]> {
    return await db
      .select()
      .from(contentIdeas)
      .where(eq(contentIdeas.status, status))
      .orderBy(desc(contentIdeas.createdAt));
  }

  async getPendingIdeasForClient(clientId: string): Promise<ContentIdea[]> {
    return await db
      .select()
      .from(contentIdeas)
      .where(
        and(
          eq(contentIdeas.clientId, clientId),
          eq(contentIdeas.status, "pending")
        )
      )
      .orderBy(desc(contentIdeas.createdAt));
  }

  async createContentIdea(idea: InsertContentIdea): Promise<ContentIdea> {
    const [created] = await db.insert(contentIdeas).values(idea).returning();
    return created;
  }

  async updateContentIdea(id: number, updates: Partial<InsertContentIdea>): Promise<ContentIdea | undefined> {
    const [updated] = await db
      .update(contentIdeas)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentIdeas.id, id))
      .returning();
    return updated;
  }

  async deleteContentIdea(id: number): Promise<boolean> {
    await db.delete(contentIdeas).where(eq(contentIdeas.id, id));
    return true;
  }

  async approveContentIdea(id: number, approvedBy: string, clientNotes?: string): Promise<ContentIdea | undefined> {
    const [updated] = await db
      .update(contentIdeas)
      .set({
        status: "approved",
        approvedAt: new Date(),
        approvedBy,
        clientNotes: clientNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(contentIdeas.id, id))
      .returning();
    return updated;
  }

  async denyContentIdea(id: number, deniedBy: string, clientNotes?: string): Promise<ContentIdea | undefined> {
    const [updated] = await db
      .update(contentIdeas)
      .set({
        status: "denied",
        deniedAt: new Date(),
        deniedBy,
        clientNotes: clientNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(contentIdeas.id, id))
      .returning();
    return updated;
  }

  // ==================== TEAM STRUCTURE TEMPLATES METHODS ====================

  async getTeamStructureTemplates(): Promise<TeamStructureTemplate[]> {
    return await db
      .select()
      .from(teamStructureTemplates)
      .orderBy(desc(teamStructureTemplates.createdAt));
  }

  async getTeamStructureTemplate(id: number): Promise<TeamStructureTemplate | undefined> {
    const [template] = await db
      .select()
      .from(teamStructureTemplates)
      .where(eq(teamStructureTemplates.id, id));
    return template;
  }

  async getDefaultTeamStructureTemplate(): Promise<TeamStructureTemplate | undefined> {
    const [template] = await db
      .select()
      .from(teamStructureTemplates)
      .where(eq(teamStructureTemplates.isDefault, true));
    return template;
  }

  async createTeamStructureTemplate(template: InsertTeamStructureTemplate): Promise<TeamStructureTemplate> {
    // If this is set as default, clear other defaults first
    if (template.isDefault) {
      await db.update(teamStructureTemplates).set({ isDefault: false });
    }
    const [created] = await db.insert(teamStructureTemplates).values(template).returning();
    return created;
  }

  async updateTeamStructureTemplate(id: number, updates: Partial<InsertTeamStructureTemplate>): Promise<TeamStructureTemplate | undefined> {
    // If setting as default, clear other defaults first
    if (updates.isDefault) {
      await db.update(teamStructureTemplates).set({ isDefault: false });
    }
    const [updated] = await db
      .update(teamStructureTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teamStructureTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteTeamStructureTemplate(id: number): Promise<boolean> {
    await db.delete(teamStructureTemplates).where(eq(teamStructureTemplates.id, id));
    return true;
  }

  async setDefaultTeamStructureTemplate(id: number): Promise<TeamStructureTemplate | undefined> {
    // Clear all defaults first
    await db.update(teamStructureTemplates).set({ isDefault: false });
    // Set the new default
    const [updated] = await db
      .update(teamStructureTemplates)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(teamStructureTemplates.id, id))
      .returning();
    return updated;
  }

  async loadTeamStructureTemplate(id: number): Promise<InternalTeamMember[]> {
    const template = await this.getTeamStructureTemplate(id);
    if (!template) {
      throw new Error("Template not found");
    }

    // Parse the team data from JSON
    const teamData = template.teamData as any[];
    const createdMembers: InternalTeamMember[] = [];
    const idMapping: Map<number, number> = new Map(); // Maps old IDs to new IDs

    // First pass: Create all members without supervisor relationships
    for (const memberData of teamData) {
      const { id: oldId, supervisorId, createdAt, updatedAt, ...memberWithoutId } = memberData;
      
      // Check if member already exists by name and email
      const existing = await this.getInternalTeamMemberByName(memberData.name);
      if (existing) {
        // Update existing member
        const updated = await this.updateInternalTeamMember(existing.id, memberWithoutId);
        if (updated) {
          createdMembers.push(updated);
          idMapping.set(oldId, updated.id);
        }
      } else {
        // Create new member
        const created = await this.createInternalTeamMember(memberWithoutId);
        createdMembers.push(created);
        idMapping.set(oldId, created.id);
      }
    }

    // Second pass: Update supervisor relationships using the ID mapping
    for (const memberData of teamData) {
      if (memberData.supervisorId) {
        const newMemberId = idMapping.get(memberData.id);
        const newSupervisorId = idMapping.get(memberData.supervisorId);
        if (newMemberId && newSupervisorId) {
          await this.updateInternalTeamMember(newMemberId, { supervisorId: newSupervisorId });
        }
      }
    }

    // Refetch to get updated data with correct supervisor IDs
    return await this.getInternalTeamMembers();
  }

  // ==================== SAVED ITEMS (PINNED CONTENT) ====================

  async getSavedItems(userId: string): Promise<SavedItem[]> {
    return db.select().from(savedItems).where(eq(savedItems.userId, userId)).orderBy(desc(savedItems.createdAt));
  }

  async getSavedItem(id: number): Promise<SavedItem | undefined> {
    const [item] = await db.select().from(savedItems).where(eq(savedItems.id, id));
    return item;
  }

  async getSavedItemsByType(userId: string, itemType: string): Promise<SavedItem[]> {
    return db.select().from(savedItems).where(and(eq(savedItems.userId, userId), eq(savedItems.itemType, itemType))).orderBy(desc(savedItems.createdAt));
  }

  async isItemSaved(userId: string, itemType: string, itemId: number): Promise<boolean> {
    const [item] = await db.select().from(savedItems).where(and(eq(savedItems.userId, userId), eq(savedItems.itemType, itemType), eq(savedItems.itemId, itemId)));
    return !!item;
  }

  async createSavedItem(item: InsertSavedItem): Promise<SavedItem> {
    const [saved] = await db.insert(savedItems).values(item).returning();
    return saved;
  }

  async updateSavedItem(id: number, updates: Partial<InsertSavedItem>): Promise<SavedItem | undefined> {
    const [updated] = await db.update(savedItems).set(updates).where(eq(savedItems.id, id)).returning();
    return updated;
  }

  async deleteSavedItem(id: number): Promise<boolean> {
    await db.delete(savedItems).where(eq(savedItems.id, id));
    return true;
  }

  async deleteSavedItemByTarget(userId: string, itemType: string, itemId: number): Promise<boolean> {
    await db.delete(savedItems).where(and(eq(savedItems.userId, userId), eq(savedItems.itemType, itemType), eq(savedItems.itemId, itemId)));
    return true;
  }

  // ==================== FEEDBACK SUBMISSIONS ====================

  async getFeedbackSubmissions(targetType?: string, targetId?: number): Promise<FeedbackSubmission[]> {
    if (targetType && targetId) {
      return db.select().from(feedbackSubmissions).where(and(eq(feedbackSubmissions.targetType, targetType), eq(feedbackSubmissions.targetId, targetId))).orderBy(desc(feedbackSubmissions.createdAt));
    }
    if (targetType) {
      return db.select().from(feedbackSubmissions).where(eq(feedbackSubmissions.targetType, targetType)).orderBy(desc(feedbackSubmissions.createdAt));
    }
    return db.select().from(feedbackSubmissions).orderBy(desc(feedbackSubmissions.createdAt));
  }

  async getFeedbackSubmission(id: number): Promise<FeedbackSubmission | undefined> {
    const [feedback] = await db.select().from(feedbackSubmissions).where(eq(feedbackSubmissions.id, id));
    return feedback;
  }

  async getFeedbackByUser(userId: string): Promise<FeedbackSubmission[]> {
    return db.select().from(feedbackSubmissions).where(eq(feedbackSubmissions.submittedBy, userId)).orderBy(desc(feedbackSubmissions.createdAt));
  }

  async createFeedbackSubmission(feedback: InsertFeedbackSubmission): Promise<FeedbackSubmission> {
    const [created] = await db.insert(feedbackSubmissions).values(feedback).returning();
    return created;
  }

  async respondToFeedback(id: number, respondedBy: string, responseText: string): Promise<FeedbackSubmission | undefined> {
    const [updated] = await db.update(feedbackSubmissions).set({ respondedBy, responseText, respondedAt: new Date() }).where(eq(feedbackSubmissions.id, id)).returning();
    return updated;
  }

  async deleteFeedbackSubmission(id: number): Promise<boolean> {
    await db.delete(feedbackSubmissions).where(eq(feedbackSubmissions.id, id));
    return true;
  }

  async getFeedbackStats(targetType: string, targetId: number): Promise<{ avgRating: number; totalCount: number; byCategory: Record<string, number> }> {
    const feedbacks = await db.select().from(feedbackSubmissions).where(and(eq(feedbackSubmissions.targetType, targetType), eq(feedbackSubmissions.targetId, targetId)));
    const totalCount = feedbacks.length;
    const avgRating = totalCount > 0 ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalCount : 0;
    const byCategory: Record<string, number> = {};
    feedbacks.forEach(f => {
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    });
    return { avgRating, totalCount, byCategory };
  }

  // ==================== YOUTUBE REFERENCES ====================

  async getYoutubeReferences(targetType?: string, targetId?: number): Promise<YoutubeReference[]> {
    if (targetType && targetId) {
      return db.select().from(youtubeReferences).where(and(eq(youtubeReferences.targetType, targetType), eq(youtubeReferences.targetId, targetId))).orderBy(desc(youtubeReferences.createdAt));
    }
    if (targetType) {
      return db.select().from(youtubeReferences).where(eq(youtubeReferences.targetType, targetType)).orderBy(desc(youtubeReferences.createdAt));
    }
    return db.select().from(youtubeReferences).orderBy(desc(youtubeReferences.createdAt));
  }

  async getYoutubeReference(id: number): Promise<YoutubeReference | undefined> {
    const [ref] = await db.select().from(youtubeReferences).where(eq(youtubeReferences.id, id));
    return ref;
  }

  async getYoutubeReferencesByStringTarget(targetType: string, targetStringId: string): Promise<YoutubeReference[]> {
    return db.select().from(youtubeReferences).where(and(eq(youtubeReferences.targetType, targetType), eq(youtubeReferences.targetStringId, targetStringId))).orderBy(desc(youtubeReferences.createdAt));
  }

  async createYoutubeReference(reference: InsertYoutubeReference): Promise<YoutubeReference> {
    const [created] = await db.insert(youtubeReferences).values(reference).returning();
    return created;
  }

  async updateYoutubeReference(id: number, updates: Partial<InsertYoutubeReference>): Promise<YoutubeReference | undefined> {
    const [updated] = await db.update(youtubeReferences).set(updates).where(eq(youtubeReferences.id, id)).returning();
    return updated;
  }

  async deleteYoutubeReference(id: number): Promise<boolean> {
    await db.delete(youtubeReferences).where(eq(youtubeReferences.id, id));
    return true;
  }

  // ==================== BURNDOWN SNAPSHOTS ====================

  async getBurndownSnapshots(campaignId?: number, startDate?: Date, endDate?: Date): Promise<BurndownSnapshot[]> {
    let query = db.select().from(burndownSnapshots);
    const conditions = [];
    if (campaignId) conditions.push(eq(burndownSnapshots.campaignId, campaignId));
    if (startDate) conditions.push(sql`${burndownSnapshots.snapshotDate} >= ${startDate}`);
    if (endDate) conditions.push(sql`${burndownSnapshots.snapshotDate} <= ${endDate}`);
    if (conditions.length > 0) {
      return db.select().from(burndownSnapshots).where(and(...conditions)).orderBy(desc(burndownSnapshots.snapshotDate));
    }
    return db.select().from(burndownSnapshots).orderBy(desc(burndownSnapshots.snapshotDate));
  }

  async getBurndownSnapshot(id: number): Promise<BurndownSnapshot | undefined> {
    const [snapshot] = await db.select().from(burndownSnapshots).where(eq(burndownSnapshots.id, id));
    return snapshot;
  }

  async getLatestBurndownSnapshot(campaignId?: number): Promise<BurndownSnapshot | undefined> {
    if (campaignId) {
      const [snapshot] = await db.select().from(burndownSnapshots).where(eq(burndownSnapshots.campaignId, campaignId)).orderBy(desc(burndownSnapshots.snapshotDate)).limit(1);
      return snapshot;
    }
    const [snapshot] = await db.select().from(burndownSnapshots).where(isNull(burndownSnapshots.campaignId)).orderBy(desc(burndownSnapshots.snapshotDate)).limit(1);
    return snapshot;
  }

  async createBurndownSnapshot(snapshot: InsertBurndownSnapshot): Promise<BurndownSnapshot> {
    const [created] = await db.insert(burndownSnapshots).values(snapshot).returning();
    return created;
  }

  async generateBurndownSnapshot(campaignId?: number): Promise<BurndownSnapshot> {
    // Get all tasks and count by status
    let tasks;
    if (campaignId) {
      tasks = await db.select().from(contentTasks).where(eq(contentTasks.campaignId, campaignId));
    } else {
      tasks = await db.select().from(contentTasks);
    }
    
    const statusCounts = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === "done").length,
      inProgress: tasks.filter(t => t.status === "in_progress").length,
      blocked: tasks.filter(t => t.status === "blocked").length,
      pending: tasks.filter(t => t.status === "pending" || t.status === "backlog").length,
    };
    
    const snapshot: InsertBurndownSnapshot = {
      snapshotDate: new Date(),
      totalTasks: statusCounts.total,
      completedTasks: statusCounts.completed,
      inProgressTasks: statusCounts.inProgress,
      blockedTasks: statusCounts.blocked,
      pendingTasks: statusCounts.pending,
      campaignId: campaignId || null,
      metadata: {
        byPriority: {
          urgent: tasks.filter(t => t.priority === "urgent").length,
          high: tasks.filter(t => t.priority === "high").length,
          medium: tasks.filter(t => t.priority === "medium").length,
          low: tasks.filter(t => t.priority === "low").length,
        }
      },
    };
    
    return this.createBurndownSnapshot(snapshot);
  }

  // ==================== LIBRARY ASSETS (ENHANCED) ====================

  async getLibraryAssets(filters?: { category?: string; clientProfileId?: number; isPublic?: boolean; tags?: string[] }): Promise<LibraryAsset[]> {
    const conditions = [];
    if (filters?.category) conditions.push(eq(libraryAssets.category, filters.category));
    if (filters?.clientProfileId) conditions.push(eq(libraryAssets.clientProfileId, filters.clientProfileId));
    if (filters?.isPublic !== undefined) conditions.push(eq(libraryAssets.isPublic, filters.isPublic));
    
    if (conditions.length > 0) {
      return db.select().from(libraryAssets).where(and(...conditions)).orderBy(desc(libraryAssets.createdAt));
    }
    return db.select().from(libraryAssets).orderBy(desc(libraryAssets.createdAt));
  }

  async getLibraryAsset(id: number): Promise<LibraryAsset | undefined> {
    const [asset] = await db.select().from(libraryAssets).where(eq(libraryAssets.id, id));
    return asset;
  }

  async searchLibraryAssets(query: string): Promise<LibraryAsset[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    return db.select().from(libraryAssets).where(or(sql`LOWER(${libraryAssets.name}) LIKE ${searchTerm}`, sql`LOWER(${libraryAssets.description}) LIKE ${searchTerm}`, sql`LOWER(${libraryAssets.tags}) LIKE ${searchTerm}`)).orderBy(desc(libraryAssets.createdAt));
  }

  async createLibraryAsset(asset: InsertLibraryAsset): Promise<LibraryAsset> {
    const [created] = await db.insert(libraryAssets).values(asset).returning();
    return created;
  }

  async updateLibraryAsset(id: number, updates: Partial<InsertLibraryAsset>): Promise<LibraryAsset | undefined> {
    const [updated] = await db.update(libraryAssets).set({ ...updates, updatedAt: new Date() }).where(eq(libraryAssets.id, id)).returning();
    return updated;
  }

  async deleteLibraryAsset(id: number): Promise<boolean> {
    await db.delete(libraryAssets).where(eq(libraryAssets.id, id));
    return true;
  }

  async incrementAssetUsage(id: number): Promise<LibraryAsset | undefined> {
    const [updated] = await db.update(libraryAssets).set({ usageCount: sql`${libraryAssets.usageCount} + 1` }).where(eq(libraryAssets.id, id)).returning();
    return updated;
  }

  async toggleAssetFavorite(id: number): Promise<LibraryAsset | undefined> {
    const asset = await this.getLibraryAsset(id);
    if (!asset) return undefined;
    const [updated] = await db.update(libraryAssets).set({ isFavorite: !asset.isFavorite, updatedAt: new Date() }).where(eq(libraryAssets.id, id)).returning();
    return updated;
  }

  async getAssetStats(): Promise<{ totalAssets: number; byCategory: Record<string, number>; totalSize: number; recentlyAdded: number }> {
    const allAssets = await db.select().from(libraryAssets);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const byCategory: Record<string, number> = {};
    let totalSize = 0;
    let recentlyAdded = 0;
    
    allAssets.forEach(asset => {
      byCategory[asset.category] = (byCategory[asset.category] || 0) + 1;
      totalSize += asset.fileSize || 0;
      if (asset.createdAt && new Date(asset.createdAt) > oneWeekAgo) {
        recentlyAdded++;
      }
    });
    
    return { totalAssets: allAssets.length, byCategory, totalSize, recentlyAdded };
  }

  // ==================== TASK SUBTASKS (CHECKLISTS) ====================

  async getTaskSubtasks(taskType: string, taskId: number): Promise<TaskSubtask[]> {
    return db.select().from(taskSubtasks)
      .where(and(eq(taskSubtasks.taskType, taskType), eq(taskSubtasks.taskId, taskId)))
      .orderBy(taskSubtasks.sortOrder);
  }

  async createTaskSubtask(subtask: InsertTaskSubtask): Promise<TaskSubtask> {
    const [created] = await db.insert(taskSubtasks).values(subtask).returning();
    return created;
  }

  async updateTaskSubtask(id: number, updates: Partial<InsertTaskSubtask>): Promise<TaskSubtask | undefined> {
    const completedAt = updates.isCompleted ? new Date() : null;
    const [updated] = await db.update(taskSubtasks)
      .set({ ...updates, completedAt })
      .where(eq(taskSubtasks.id, id))
      .returning();
    return updated;
  }

  async deleteTaskSubtask(id: number): Promise<boolean> {
    await db.delete(taskSubtasks).where(eq(taskSubtasks.id, id));
    return true;
  }

  async reorderTaskSubtasks(taskType: string, taskId: number, subtaskIds: number[]): Promise<void> {
    for (let i = 0; i < subtaskIds.length; i++) {
      await db.update(taskSubtasks)
        .set({ sortOrder: i })
        .where(eq(taskSubtasks.id, subtaskIds[i]));
    }
  }

  // ==================== TASK ENHANCEMENTS (PRIORITY, TIME, CLIENT) ====================

  async getTaskEnhancement(taskId: number): Promise<TaskEnhancement | undefined> {
    const [enhancement] = await db.select().from(taskEnhancements).where(eq(taskEnhancements.taskId, taskId));
    return enhancement;
  }

  async upsertTaskEnhancement(taskId: number, updates: Partial<InsertTaskEnhancement>): Promise<TaskEnhancement> {
    const existing = await this.getTaskEnhancement(taskId);
    if (existing) {
      const [updated] = await db.update(taskEnhancements)
        .set(updates)
        .where(eq(taskEnhancements.taskId, taskId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(taskEnhancements)
      .values({ taskId, ...updates })
      .returning();
    return created;
  }

  async deleteTaskEnhancement(taskId: number): Promise<boolean> {
    await db.delete(taskEnhancements).where(eq(taskEnhancements.taskId, taskId));
    return true;
  }

  // ==================== CLIENT DOCUMENTS (DOCS HUB) ====================

  async getClientDocuments(clientProfileId: number, includeArchived?: boolean): Promise<ClientDocument[]> {
    const conditions = [eq(clientDocuments.clientProfileId, clientProfileId)];
    if (!includeArchived) {
      conditions.push(eq(clientDocuments.isArchived, false));
    }
    return db.select().from(clientDocuments)
      .where(and(...conditions))
      .orderBy(desc(clientDocuments.createdAt));
  }

  async getClientDocument(id: number): Promise<ClientDocument | undefined> {
    const [doc] = await db.select().from(clientDocuments).where(eq(clientDocuments.id, id));
    return doc;
  }

  async searchClientDocuments(clientProfileId: number, query: string): Promise<ClientDocument[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    return db.select().from(clientDocuments)
      .where(and(
        eq(clientDocuments.clientProfileId, clientProfileId),
        eq(clientDocuments.isArchived, false),
        or(
          sql`LOWER(${clientDocuments.name}) LIKE ${searchTerm}`,
          sql`LOWER(${clientDocuments.description}) LIKE ${searchTerm}`,
          sql`LOWER(${clientDocuments.tags}) LIKE ${searchTerm}`
        )
      ))
      .orderBy(desc(clientDocuments.createdAt));
  }

  async createClientDocument(doc: InsertClientDocument): Promise<ClientDocument> {
    const [created] = await db.insert(clientDocuments).values(doc).returning();
    return created;
  }

  async updateClientDocument(id: number, updates: Partial<InsertClientDocument>): Promise<ClientDocument | undefined> {
    const [updated] = await db.update(clientDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clientDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteClientDocument(id: number): Promise<boolean> {
    await db.delete(clientDocuments).where(eq(clientDocuments.id, id));
    return true;
  }

  async archiveClientDocument(id: number): Promise<ClientDocument | undefined> {
    const [updated] = await db.update(clientDocuments)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(clientDocuments.id, id))
      .returning();
    return updated;
  }

  // ==================== WHITEBOARDS ====================

  async getWhiteboards(filters?: { clientProfileId?: number; campaignId?: number; createdBy?: string }): Promise<Whiteboard[]> {
    const conditions = [];
    if (filters?.clientProfileId) conditions.push(eq(whiteboards.clientProfileId, filters.clientProfileId));
    if (filters?.campaignId) conditions.push(eq(whiteboards.campaignId, filters.campaignId));
    if (filters?.createdBy) conditions.push(eq(whiteboards.createdBy, filters.createdBy));
    
    if (conditions.length > 0) {
      return db.select().from(whiteboards).where(and(...conditions)).orderBy(desc(whiteboards.updatedAt));
    }
    return db.select().from(whiteboards).orderBy(desc(whiteboards.updatedAt));
  }

  async getWhiteboard(id: number): Promise<Whiteboard | undefined> {
    const [board] = await db.select().from(whiteboards).where(eq(whiteboards.id, id));
    return board;
  }

  async createWhiteboard(board: InsertWhiteboard): Promise<Whiteboard> {
    const [created] = await db.insert(whiteboards).values(board).returning();
    return created;
  }

  async updateWhiteboard(id: number, updates: Partial<InsertWhiteboard>, userId?: string): Promise<Whiteboard | undefined> {
    const [updated] = await db.update(whiteboards)
      .set({ 
        ...updates, 
        updatedAt: new Date(),
        lastEditedBy: userId || undefined,
        lastEditedAt: new Date()
      })
      .where(eq(whiteboards.id, id))
      .returning();
    return updated;
  }

  async deleteWhiteboard(id: number): Promise<boolean> {
    await db.delete(whiteboards).where(eq(whiteboards.id, id));
    return true;
  }

  // ==================== WHITEBOARD ELEMENTS ====================

  async getWhiteboardElements(whiteboardId: number): Promise<WhiteboardElement[]> {
    return db.select().from(whiteboardElements)
      .where(eq(whiteboardElements.whiteboardId, whiteboardId))
      .orderBy(whiteboardElements.zIndex);
  }

  async getWhiteboardElement(id: number): Promise<WhiteboardElement | undefined> {
    const [element] = await db.select().from(whiteboardElements).where(eq(whiteboardElements.id, id));
    return element;
  }

  async createWhiteboardElement(element: InsertWhiteboardElement): Promise<WhiteboardElement> {
    const [created] = await db.insert(whiteboardElements).values(element).returning();
    return created;
  }

  async updateWhiteboardElement(id: number, updates: Partial<InsertWhiteboardElement>): Promise<WhiteboardElement | undefined> {
    const [updated] = await db.update(whiteboardElements)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(whiteboardElements.id, id))
      .returning();
    return updated;
  }

  async deleteWhiteboardElement(id: number): Promise<boolean> {
    await db.delete(whiteboardElements).where(eq(whiteboardElements.id, id));
    return true;
  }

  async bulkUpdateWhiteboardElements(updates: Array<{ id: number; updates: Partial<InsertWhiteboardElement> }>): Promise<WhiteboardElement[]> {
    const results: WhiteboardElement[] = [];
    for (const { id, updates: u } of updates) {
      const updated = await this.updateWhiteboardElement(id, u);
      if (updated) results.push(updated);
    }
    return results;
  }

  // ==================== WHITEBOARD CONNECTORS ====================

  async getWhiteboardConnectors(whiteboardId: number): Promise<WhiteboardConnector[]> {
    return db.select().from(whiteboardConnectors).where(eq(whiteboardConnectors.whiteboardId, whiteboardId));
  }

  async createWhiteboardConnector(connector: InsertWhiteboardConnector): Promise<WhiteboardConnector> {
    const [created] = await db.insert(whiteboardConnectors).values(connector).returning();
    return created;
  }

  async updateWhiteboardConnector(id: number, updates: Partial<InsertWhiteboardConnector>): Promise<WhiteboardConnector | undefined> {
    const [updated] = await db.update(whiteboardConnectors).set(updates).where(eq(whiteboardConnectors.id, id)).returning();
    return updated;
  }

  async deleteWhiteboardConnector(id: number): Promise<boolean> {
    await db.delete(whiteboardConnectors).where(eq(whiteboardConnectors.id, id));
    return true;
  }

  // ==================== WHITEBOARD COLLABORATORS ====================

  async getWhiteboardCollaborators(whiteboardId: number): Promise<WhiteboardCollaborator[]> {
    return db.select().from(whiteboardCollaborators).where(eq(whiteboardCollaborators.whiteboardId, whiteboardId));
  }

  async getActiveWhiteboardCollaborators(whiteboardId: number): Promise<WhiteboardCollaborator[]> {
    return db.select().from(whiteboardCollaborators)
      .where(and(eq(whiteboardCollaborators.whiteboardId, whiteboardId), eq(whiteboardCollaborators.isActive, true)));
  }

  async addWhiteboardCollaborator(collab: InsertWhiteboardCollaborator): Promise<WhiteboardCollaborator> {
    const existing = await db.select().from(whiteboardCollaborators)
      .where(and(eq(whiteboardCollaborators.whiteboardId, collab.whiteboardId), eq(whiteboardCollaborators.userId, collab.userId)));
    if (existing.length > 0) {
      const [updated] = await db.update(whiteboardCollaborators)
        .set({ permission: collab.permission })
        .where(eq(whiteboardCollaborators.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(whiteboardCollaborators).values(collab).returning();
    return created;
  }

  async updateCollaboratorCursor(whiteboardId: number, userId: string, cursorX: number, cursorY: number): Promise<void> {
    await db.update(whiteboardCollaborators)
      .set({ cursorX, cursorY, isActive: true, lastActiveAt: new Date() })
      .where(and(eq(whiteboardCollaborators.whiteboardId, whiteboardId), eq(whiteboardCollaborators.userId, userId)));
  }

  async setCollaboratorActive(whiteboardId: number, userId: string, isActive: boolean): Promise<void> {
    await db.update(whiteboardCollaborators)
      .set({ isActive, lastActiveAt: new Date() })
      .where(and(eq(whiteboardCollaborators.whiteboardId, whiteboardId), eq(whiteboardCollaborators.userId, userId)));
  }

  async removeWhiteboardCollaborator(whiteboardId: number, userId: string): Promise<boolean> {
    await db.delete(whiteboardCollaborators)
      .where(and(eq(whiteboardCollaborators.whiteboardId, whiteboardId), eq(whiteboardCollaborators.userId, userId)));
    return true;
  }

  // ==================== ENHANCED TASK WATCHERS (Both Types) ====================

  async getTaskWatchersByType(taskType: string, taskId: number): Promise<TaskWatcher[]> {
    return db.select().from(taskWatchers)
      .where(and(eq(taskWatchers.taskType, taskType), eq(taskWatchers.taskId, taskId)));
  }

  async getUserWatchedTasks(userId: string, taskType?: string): Promise<TaskWatcher[]> {
    if (taskType) {
      return db.select().from(taskWatchers)
        .where(and(eq(taskWatchers.userId, userId), eq(taskWatchers.taskType, taskType)));
    }
    return db.select().from(taskWatchers).where(eq(taskWatchers.userId, userId));
  }

  async watchTaskByType(taskType: string, taskId: number, userId: string, options?: { notifyOnStatusChange?: boolean; notifyOnComment?: boolean; notifyOnAssignment?: boolean }): Promise<TaskWatcher> {
    const existing = await db.select().from(taskWatchers)
      .where(and(eq(taskWatchers.taskType, taskType), eq(taskWatchers.taskId, taskId), eq(taskWatchers.userId, userId)));
    if (existing.length > 0) {
      return existing[0];
    }
    const [created] = await db.insert(taskWatchers).values({
      taskType,
      taskId,
      userId,
      notifyOnStatusChange: options?.notifyOnStatusChange ?? true,
      notifyOnComment: options?.notifyOnComment ?? true,
      notifyOnAssignment: options?.notifyOnAssignment ?? true,
    }).returning();
    return created;
  }

  async unwatchTaskByType(taskType: string, taskId: number, userId: string): Promise<boolean> {
    await db.delete(taskWatchers)
      .where(and(eq(taskWatchers.taskType, taskType), eq(taskWatchers.taskId, taskId), eq(taskWatchers.userId, userId)));
    return true;
  }

  async updateWatcherPreferences(watcherId: number, prefs: { notifyOnStatusChange?: boolean; notifyOnComment?: boolean; notifyOnAssignment?: boolean }): Promise<TaskWatcher | undefined> {
    const [updated] = await db.update(taskWatchers).set(prefs).where(eq(taskWatchers.id, watcherId)).returning();
    return updated;
  }

  // ==================== DAO MANAGEMENT SYSTEM IMPLEMENTATIONS ====================

  // DAO Roles
  async getDaoRoles(): Promise<DaoRole[]> {
    return db.select().from(daoRoles).orderBy(daoRoles.tier);
  }

  async getDaoRole(id: number): Promise<DaoRole | undefined> {
    const [role] = await db.select().from(daoRoles).where(eq(daoRoles.id, id));
    return role;
  }

  async createDaoRole(role: InsertDaoRole): Promise<DaoRole> {
    const [created] = await db.insert(daoRoles).values(role).returning();
    return created;
  }

  async updateDaoRole(id: number, updates: Partial<InsertDaoRole>): Promise<DaoRole | undefined> {
    const [updated] = await db.update(daoRoles).set(updates).where(eq(daoRoles.id, id)).returning();
    return updated;
  }

  // DAO Memberships
  async getDaoMemberships(): Promise<DaoMembership[]> {
    return db.select().from(daoMemberships).orderBy(desc(daoMemberships.createdAt));
  }

  async getDaoMembership(id: number): Promise<DaoMembership | undefined> {
    const [membership] = await db.select().from(daoMemberships).where(eq(daoMemberships.id, id));
    return membership;
  }

  async getDaoMembershipByUserId(userId: string): Promise<DaoMembership | undefined> {
    const [membership] = await db.select().from(daoMemberships)
      .where(and(eq(daoMemberships.userId, userId), isNull(daoMemberships.activeTo)));
    return membership;
  }

  async getDaoMembershipByTeamMemberId(teamMemberId: number): Promise<DaoMembership | undefined> {
    const [membership] = await db.select().from(daoMemberships)
      .where(and(eq(daoMemberships.internalTeamMemberId, teamMemberId), isNull(daoMemberships.activeTo)));
    return membership;
  }

  async getCouncilMembers(): Promise<DaoMembership[]> {
    return db.select().from(daoMemberships)
      .where(and(eq(daoMemberships.isCouncil, true), isNull(daoMemberships.activeTo)));
  }

  async createDaoMembership(membership: InsertDaoMembership): Promise<DaoMembership> {
    const [created] = await db.insert(daoMemberships).values(membership).returning();
    return created;
  }

  async updateDaoMembership(id: number, updates: Partial<InsertDaoMembership>): Promise<DaoMembership | undefined> {
    const [updated] = await db.update(daoMemberships)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(daoMemberships.id, id)).returning();
    return updated;
  }

  async updateMemberCumulativeRevenue(id: number, amount: number): Promise<DaoMembership | undefined> {
    const membership = await this.getDaoMembership(id);
    if (!membership) return undefined;
    const newTotal = (membership.cumulativeRevenue || 0) + amount;
    const [updated] = await db.update(daoMemberships)
      .set({ cumulativeRevenue: newTotal, updatedAt: new Date() })
      .where(eq(daoMemberships.id, id)).returning();
    return updated;
  }

  // DAO Service Catalog
  async getDaoServiceCatalog(activeOnly: boolean = true): Promise<DaoServiceCatalog[]> {
    if (activeOnly) {
      return db.select().from(daoServiceCatalog)
        .where(eq(daoServiceCatalog.isActive, true))
        .orderBy(daoServiceCatalog.category, daoServiceCatalog.sortOrder);
    }
    return db.select().from(daoServiceCatalog).orderBy(daoServiceCatalog.category, daoServiceCatalog.sortOrder);
  }

  async getDaoService(id: number): Promise<DaoServiceCatalog | undefined> {
    const [service] = await db.select().from(daoServiceCatalog).where(eq(daoServiceCatalog.id, id));
    return service;
  }

  async getDaoServicesByCategory(category: string): Promise<DaoServiceCatalog[]> {
    return db.select().from(daoServiceCatalog)
      .where(and(eq(daoServiceCatalog.category, category), eq(daoServiceCatalog.isActive, true)))
      .orderBy(daoServiceCatalog.sortOrder);
  }

  async createDaoService(service: InsertDaoServiceCatalog): Promise<DaoServiceCatalog> {
    const [created] = await db.insert(daoServiceCatalog).values(service).returning();
    return created;
  }

  async updateDaoService(id: number, updates: Partial<InsertDaoServiceCatalog>): Promise<DaoServiceCatalog | undefined> {
    const [updated] = await db.update(daoServiceCatalog)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(daoServiceCatalog.id, id)).returning();
    return updated;
  }

  async deleteDaoService(id: number): Promise<boolean> {
    await db.delete(daoServiceCatalog).where(eq(daoServiceCatalog.id, id));
    return true;
  }

  // DAO Discounts
  async getDaoDiscounts(activeOnly: boolean = true): Promise<DaoDiscount[]> {
    if (activeOnly) {
      return db.select().from(daoDiscounts).where(eq(daoDiscounts.isActive, true));
    }
    return db.select().from(daoDiscounts);
  }

  async getDaoDiscount(id: number): Promise<DaoDiscount | undefined> {
    const [discount] = await db.select().from(daoDiscounts).where(eq(daoDiscounts.id, id));
    return discount;
  }

  async createDaoDiscount(discount: InsertDaoDiscount): Promise<DaoDiscount> {
    const [created] = await db.insert(daoDiscounts).values(discount).returning();
    return created;
  }

  async updateDaoDiscount(id: number, updates: Partial<InsertDaoDiscount>): Promise<DaoDiscount | undefined> {
    const [updated] = await db.update(daoDiscounts).set(updates).where(eq(daoDiscounts.id, id)).returning();
    return updated;
  }

  async deleteDaoDiscount(id: number): Promise<boolean> {
    await db.delete(daoDiscounts).where(eq(daoDiscounts.id, id));
    return true;
  }

  // DAO Projects
  async getDaoProjects(filters?: { status?: string; clientProfileId?: number }): Promise<DaoProject[]> {
    let query = db.select().from(daoProjects);
    if (filters?.status) {
      query = query.where(eq(daoProjects.status, filters.status)) as any;
    }
    if (filters?.clientProfileId) {
      query = query.where(eq(daoProjects.clientProfileId, filters.clientProfileId)) as any;
    }
    return query.orderBy(desc(daoProjects.createdAt));
  }

  async getDaoProject(id: number): Promise<DaoProject | undefined> {
    const [project] = await db.select().from(daoProjects).where(eq(daoProjects.id, id));
    return project;
  }

  async createDaoProject(project: InsertDaoProject): Promise<DaoProject> {
    const [created] = await db.insert(daoProjects).values(project).returning();
    return created;
  }

  async updateDaoProject(id: number, updates: Partial<InsertDaoProject>): Promise<DaoProject | undefined> {
    const [updated] = await db.update(daoProjects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(daoProjects.id, id)).returning();
    return updated;
  }

  async deleteDaoProject(id: number): Promise<boolean> {
    await db.delete(daoProjects).where(eq(daoProjects.id, id));
    return true;
  }

  // DAO Project Services
  async getDaoProjectServices(projectId: number): Promise<DaoProjectService[]> {
    return db.select().from(daoProjectServices).where(eq(daoProjectServices.projectId, projectId));
  }

  async createDaoProjectService(service: InsertDaoProjectService): Promise<DaoProjectService> {
    const [created] = await db.insert(daoProjectServices).values(service).returning();
    return created;
  }

  async updateDaoProjectService(id: number, updates: Partial<InsertDaoProjectService>): Promise<DaoProjectService | undefined> {
    const [updated] = await db.update(daoProjectServices).set(updates).where(eq(daoProjectServices.id, id)).returning();
    return updated;
  }

  async deleteDaoProjectService(id: number): Promise<boolean> {
    await db.delete(daoProjectServices).where(eq(daoProjectServices.id, id));
    return true;
  }

  // DAO Revenue Attributions
  async getDaoRevenueAttributions(projectId: number): Promise<DaoRevenueAttribution[]> {
    return db.select().from(daoRevenueAttributions).where(eq(daoRevenueAttributions.projectId, projectId));
  }

  async getDaoRevenueAttributionsByMember(membershipId: number): Promise<DaoRevenueAttribution[]> {
    return db.select().from(daoRevenueAttributions).where(eq(daoRevenueAttributions.membershipId, membershipId));
  }

  async createDaoRevenueAttribution(attribution: InsertDaoRevenueAttribution): Promise<DaoRevenueAttribution> {
    const [created] = await db.insert(daoRevenueAttributions).values(attribution).returning();
    return created;
  }

  async updateDaoRevenueAttribution(id: number, updates: Partial<InsertDaoRevenueAttribution>): Promise<DaoRevenueAttribution | undefined> {
    const [updated] = await db.update(daoRevenueAttributions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(daoRevenueAttributions.id, id)).returning();
    return updated;
  }

  async approveDaoRevenueAttribution(id: number, approvedBy: string): Promise<DaoRevenueAttribution | undefined> {
    const [updated] = await db.update(daoRevenueAttributions)
      .set({ isApproved: true, approvedBy, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(daoRevenueAttributions.id, id)).returning();
    return updated;
  }

  async applyDefaultAttributionTemplate(projectId: number, leadId: number, pmId: number, coreContributors: number[], supportContributors: number[]): Promise<DaoRevenueAttribution[]> {
    const project = await this.getDaoProject(projectId);
    if (!project || !project.finalAmount) return [];
    
    const results: DaoRevenueAttribution[] = [];
    const finalAmount = project.finalAmount;
    
    // Lead: 30%
    const leadAttribution = await this.createDaoRevenueAttribution({
      projectId,
      membershipId: leadId,
      roleSlot: "lead",
      percentAllocation: 30,
      attributedAmount: Math.round(finalAmount * 0.30),
    });
    results.push(leadAttribution);
    
    // PM: 15%
    const pmAttribution = await this.createDaoRevenueAttribution({
      projectId,
      membershipId: pmId,
      roleSlot: "pm",
      percentAllocation: 15,
      attributedAmount: Math.round(finalAmount * 0.15),
    });
    results.push(pmAttribution);
    
    // Core Contributors: 40% split
    if (coreContributors.length > 0) {
      const corePercent = 40 / coreContributors.length;
      for (const memberId of coreContributors) {
        const coreAttribution = await this.createDaoRevenueAttribution({
          projectId,
          membershipId: memberId,
          roleSlot: "core",
          percentAllocation: corePercent,
          attributedAmount: Math.round(finalAmount * (corePercent / 100)),
        });
        results.push(coreAttribution);
      }
    }
    
    // Support Contributors: 10% split
    if (supportContributors.length > 0) {
      const supportPercent = 10 / supportContributors.length;
      for (const memberId of supportContributors) {
        const supportAttribution = await this.createDaoRevenueAttribution({
          projectId,
          membershipId: memberId,
          roleSlot: "support",
          percentAllocation: supportPercent,
          attributedAmount: Math.round(finalAmount * (supportPercent / 100)),
        });
        results.push(supportAttribution);
      }
    }
    
    // Overhead: 5%
    const overheadAttribution = await this.createDaoRevenueAttribution({
      projectId,
      membershipId: leadId, // Assign overhead to lead
      roleSlot: "overhead",
      percentAllocation: 5,
      attributedAmount: Math.round(finalAmount * 0.05),
    });
    results.push(overheadAttribution);
    
    return results;
  }

  // DAO Debriefs
  async getDaoDebriefs(projectId?: number): Promise<DaoDebrief[]> {
    if (projectId) {
      return db.select().from(daoDebriefs).where(eq(daoDebriefs.projectId, projectId));
    }
    return db.select().from(daoDebriefs).orderBy(desc(daoDebriefs.createdAt));
  }

  async getDaoDebrief(id: number): Promise<DaoDebrief | undefined> {
    const [debrief] = await db.select().from(daoDebriefs).where(eq(daoDebriefs.id, id));
    return debrief;
  }

  async createDaoDebrief(debrief: InsertDaoDebrief): Promise<DaoDebrief> {
    const [created] = await db.insert(daoDebriefs).values(debrief).returning();
    return created;
  }

  async updateDaoDebrief(id: number, updates: Partial<InsertDaoDebrief>): Promise<DaoDebrief | undefined> {
    const [updated] = await db.update(daoDebriefs).set(updates).where(eq(daoDebriefs.id, id)).returning();
    return updated;
  }

  // DAO Treasury
  async getDaoTreasury(): Promise<DaoTreasury | undefined> {
    const [treasury] = await db.select().from(daoTreasury);
    return treasury;
  }

  async initializeDaoTreasury(): Promise<DaoTreasury> {
    const existing = await this.getDaoTreasury();
    if (existing) return existing;
    const [created] = await db.insert(daoTreasury).values({
      balance: 0,
      lastBonusTriggerBalance: 0,
      bonusTriggerThreshold: 10000000, // $100,000 in cents
    }).returning();
    return created;
  }

  async updateDaoTreasuryBalance(amount: number): Promise<DaoTreasury | undefined> {
    const treasury = await this.getDaoTreasury();
    if (!treasury) return undefined;
    const [updated] = await db.update(daoTreasury)
      .set({ balance: treasury.balance + amount, updatedAt: new Date() })
      .where(eq(daoTreasury.id, treasury.id)).returning();
    return updated;
  }

  // DAO Treasury Transactions
  async getDaoTreasuryTransactions(limit: number = 50): Promise<DaoTreasuryTransaction[]> {
    return db.select().from(daoTreasuryTransactions)
      .orderBy(desc(daoTreasuryTransactions.createdAt))
      .limit(limit);
  }

  async createDaoTreasuryTransaction(txn: InsertDaoTreasuryTransaction): Promise<DaoTreasuryTransaction> {
    const [created] = await db.insert(daoTreasuryTransactions).values(txn).returning();
    await this.updateDaoTreasuryBalance(txn.amount);
    return created;
  }

  async recordProjectTreasuryContribution(projectId: number, amount: number, createdBy: string): Promise<DaoTreasuryTransaction> {
    return this.createDaoTreasuryTransaction({
      txnType: "project_inflow",
      amount,
      projectId,
      memo: "15% treasury contribution from project",
      createdBy,
    });
  }

  // DAO Bonus Runs
  async getDaoBonusRuns(): Promise<DaoBonusRun[]> {
    return db.select().from(daoBonusRuns).orderBy(desc(daoBonusRuns.executedAt));
  }

  async getDaoBonusRun(id: number): Promise<DaoBonusRun | undefined> {
    const [run] = await db.select().from(daoBonusRuns).where(eq(daoBonusRuns.id, id));
    return run;
  }

  async createDaoBonusRun(run: InsertDaoBonusRun): Promise<DaoBonusRun> {
    const [created] = await db.insert(daoBonusRuns).values(run).returning();
    return created;
  }

  async getDaoBonusRunRecipients(bonusRunId: number): Promise<DaoBonusRunRecipient[]> {
    return db.select().from(daoBonusRunRecipients).where(eq(daoBonusRunRecipients.bonusRunId, bonusRunId));
  }

  async createDaoBonusRunRecipient(recipient: InsertDaoBonusRunRecipient): Promise<DaoBonusRunRecipient> {
    const [created] = await db.insert(daoBonusRunRecipients).values(recipient).returning();
    return created;
  }

  async simulateBonusDistribution(): Promise<{ members: { membershipId: number; multiplier: number; share: number }[]; totalToDistribute: number; eligible: boolean }> {
    const treasury = await this.getDaoTreasury();
    if (!treasury) {
      return { members: [], totalToDistribute: 0, eligible: false };
    }
    
    const eligible = treasury.balance >= treasury.bonusTriggerThreshold;
    if (!eligible) {
      return { members: [], totalToDistribute: 0, eligible: false };
    }
    
    const memberships = await db.select().from(daoMemberships)
      .where(isNull(daoMemberships.activeTo));
    
    const roles = await this.getDaoRoles();
    const roleMap = new Map(roles.map(r => [r.id, r]));
    
    let totalMultiplier = 0;
    const memberData: { membershipId: number; multiplier: number }[] = [];
    
    for (const member of memberships) {
      const role = roleMap.get(member.daoRoleId);
      const multiplier = role?.multiplier || 1.0;
      totalMultiplier += multiplier;
      memberData.push({ membershipId: member.id, multiplier });
    }
    
    const totalToDistribute = treasury.balance - treasury.lastBonusTriggerBalance;
    const members = memberData.map(m => ({
      ...m,
      share: Math.round((m.multiplier / totalMultiplier) * totalToDistribute),
    }));
    
    return { members, totalToDistribute, eligible: true };
  }

  async executeBonusDistribution(triggeredBy: string): Promise<DaoBonusRun | undefined> {
    const simulation = await this.simulateBonusDistribution();
    if (!simulation.eligible || simulation.members.length === 0) {
      return undefined;
    }
    
    const treasury = await this.getDaoTreasury();
    if (!treasury) return undefined;
    
    const bonusRun = await this.createDaoBonusRun({
      treasuryBalanceBefore: treasury.balance,
      totalDistributed: simulation.totalToDistribute,
      treasuryBalanceAfter: treasury.balance - simulation.totalToDistribute,
      recipientCount: simulation.members.length,
      triggeredBy,
    });
    
    for (const member of simulation.members) {
      await this.createDaoBonusRunRecipient({
        bonusRunId: bonusRun.id,
        membershipId: member.membershipId,
        multiplier: member.multiplier,
        baseShare: Math.round(member.share / member.multiplier),
        finalAmount: member.share,
      });
    }
    
    await this.createDaoTreasuryTransaction({
      txnType: "bonus_outflow",
      amount: -simulation.totalToDistribute,
      bonusRunId: bonusRun.id,
      memo: `Bonus distribution to ${simulation.members.length} members`,
      createdBy: triggeredBy,
    });
    
    await db.update(daoTreasury)
      .set({ lastBonusTriggerBalance: treasury.balance - simulation.totalToDistribute })
      .where(eq(daoTreasury.id, treasury.id));
    
    return bonusRun;
  }

  // DAO Invoices
  async getDaoInvoices(projectId?: number): Promise<DaoInvoice[]> {
    if (projectId) {
      return db.select().from(daoInvoices)
        .where(eq(daoInvoices.projectId, projectId))
        .orderBy(daoInvoices.phase);
    }
    return db.select().from(daoInvoices).orderBy(desc(daoInvoices.createdAt));
  }

  async getDaoInvoice(id: number): Promise<DaoInvoice | undefined> {
    const [invoice] = await db.select().from(daoInvoices).where(eq(daoInvoices.id, id));
    return invoice;
  }

  async createDaoInvoice(invoice: InsertDaoInvoice): Promise<DaoInvoice> {
    const [created] = await db.insert(daoInvoices).values(invoice).returning();
    return created;
  }

  async updateDaoInvoice(id: number, updates: Partial<InsertDaoInvoice>): Promise<DaoInvoice | undefined> {
    const [updated] = await db.update(daoInvoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(daoInvoices.id, id)).returning();
    return updated;
  }

  async markDaoInvoicePaid(id: number, paymentMethod: string, paymentReference?: string): Promise<DaoInvoice | undefined> {
    const [updated] = await db.update(daoInvoices)
      .set({
        status: "paid",
        paidAt: new Date(),
        paymentMethod,
        paymentReference,
        updatedAt: new Date(),
      })
      .where(eq(daoInvoices.id, id)).returning();
    return updated;
  }

  async generateProjectInvoices(projectId: number, createdBy: string): Promise<DaoInvoice[]> {
    const project = await this.getDaoProject(projectId);
    if (!project || !project.finalAmount) return [];
    
    const invoices: DaoInvoice[] = [];
    const prefix = `INV-${project.id}-`;
    
    // Deposit invoice
    const depositAmount = Math.round(project.finalAmount * ((project.depositPercent || 30) / 100));
    const depositInvoice = await this.createDaoInvoice({
      projectId,
      invoiceNumber: `${prefix}DEP`,
      phase: "deposit",
      amount: depositAmount,
      status: "draft",
      createdBy,
    });
    invoices.push(depositInvoice);
    
    // Midpoint invoice
    const midpointAmount = Math.round(project.finalAmount * ((project.midpointPercent || 40) / 100));
    const midpointInvoice = await this.createDaoInvoice({
      projectId,
      invoiceNumber: `${prefix}MID`,
      phase: "midpoint",
      amount: midpointAmount,
      status: "draft",
      createdBy,
    });
    invoices.push(midpointInvoice);
    
    // Completion invoice
    const completionAmount = Math.round(project.finalAmount * ((project.completionPercent || 30) / 100));
    const completionInvoice = await this.createDaoInvoice({
      projectId,
      invoiceNumber: `${prefix}FIN`,
      phase: "completion",
      amount: completionAmount,
      status: "draft",
      createdBy,
    });
    invoices.push(completionInvoice);
    
    return invoices;
  }

  // DAO Rank Progressions
  async getDaoRankProgressions(membershipId?: number): Promise<DaoRankProgression[]> {
    if (membershipId) {
      return db.select().from(daoRankProgressions)
        .where(eq(daoRankProgressions.membershipId, membershipId))
        .orderBy(desc(daoRankProgressions.promotedAt));
    }
    return db.select().from(daoRankProgressions).orderBy(desc(daoRankProgressions.promotedAt));
  }

  async createDaoRankProgression(progression: InsertDaoRankProgression): Promise<DaoRankProgression> {
    const [created] = await db.insert(daoRankProgressions).values(progression).returning();
    return created;
  }

  async checkAndPromoteMember(membershipId: number, approvedBy?: string): Promise<DaoRankProgression | undefined> {
    const membership = await this.getDaoMembership(membershipId);
    if (!membership) return undefined;
    
    const currentRole = await this.getDaoRole(membership.daoRoleId);
    if (!currentRole) return undefined;
    
    const roles = await this.getDaoRoles();
    const nextRole = roles.find(r => r.tier === currentRole.tier + 1);
    
    if (!nextRole) return undefined; // Already at max tier
    
    const cumulativeRevenue = membership.cumulativeRevenue || 0;
    if (cumulativeRevenue < nextRole.cumulativeRevenueRequired) {
      return undefined; // Not enough revenue
    }
    
    // Create progression record
    const progression = await this.createDaoRankProgression({
      membershipId,
      fromRoleId: currentRole.id,
      toRoleId: nextRole.id,
      cumulativeRevenueAtPromotion: cumulativeRevenue,
      approvedBy,
    });
    
    // Update membership with new role
    await this.updateDaoMembership(membershipId, { daoRoleId: nextRole.id });
    
    return progression;
  }

  // DAO Project Links
  async getDaoProjectLinks(projectId: number): Promise<DaoProjectLink[]> {
    return db.select().from(daoProjectLinks).where(eq(daoProjectLinks.projectId, projectId));
  }

  async createDaoProjectLink(link: InsertDaoProjectLink): Promise<DaoProjectLink> {
    const [created] = await db.insert(daoProjectLinks).values(link).returning();
    return created;
  }

  async deleteDaoProjectLink(id: number): Promise<boolean> {
    await db.delete(daoProjectLinks).where(eq(daoProjectLinks.id, id));
    return true;
  }

  // DAO Permissions
  async getDaoPermissions(membershipId: number): Promise<DaoPermission[]> {
    return db.select().from(daoPermissions).where(eq(daoPermissions.membershipId, membershipId));
  }

  async getDaoPermissionByScope(membershipId: number, scope: string): Promise<DaoPermission | undefined> {
    const [permission] = await db.select().from(daoPermissions)
      .where(and(eq(daoPermissions.membershipId, membershipId), eq(daoPermissions.scope, scope)));
    return permission;
  }

  async createDaoPermission(permission: InsertDaoPermission): Promise<DaoPermission> {
    const [created] = await db.insert(daoPermissions).values(permission).returning();
    return created;
  }

  async updateDaoPermission(id: number, updates: Partial<InsertDaoPermission>): Promise<DaoPermission | undefined> {
    const [updated] = await db.update(daoPermissions).set(updates).where(eq(daoPermissions.id, id)).returning();
    return updated;
  }

  async hasCouncilPermission(membershipId: number, scope: string): Promise<boolean> {
    const membership = await this.getDaoMembership(membershipId);
    if (!membership || !membership.isCouncil) return false;
    
    const permission = await this.getDaoPermissionByScope(membershipId, scope);
    if (!permission) return true; // Council members have access by default
    
    return permission.canApprove;
  }

  // Safe Wallet methods
  async getDaoSafeWallets(): Promise<DaoSafeWallet[]> {
    return db.select().from(daoSafeWallets).where(eq(daoSafeWallets.isActive, true)).orderBy(desc(daoSafeWallets.createdAt));
  }

  async getDaoSafeWallet(id: number): Promise<DaoSafeWallet | undefined> {
    const [wallet] = await db.select().from(daoSafeWallets).where(eq(daoSafeWallets.id, id));
    return wallet;
  }

  async getDaoSafeWalletByAddress(address: string, chainId: number): Promise<DaoSafeWallet | undefined> {
    const [wallet] = await db.select().from(daoSafeWallets)
      .where(and(
        eq(daoSafeWallets.address, address.toLowerCase()),
        eq(daoSafeWallets.chainId, chainId)
      ));
    return wallet;
  }

  async createDaoSafeWallet(wallet: InsertDaoSafeWallet): Promise<DaoSafeWallet> {
    const [created] = await db.insert(daoSafeWallets).values({
      ...wallet,
      address: wallet.address.toLowerCase(),
    }).returning();
    return created;
  }

  async updateDaoSafeWallet(id: number, updates: Partial<InsertDaoSafeWallet>): Promise<DaoSafeWallet | undefined> {
    const [updated] = await db.update(daoSafeWallets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(daoSafeWallets.id, id))
      .returning();
    return updated;
  }

  async deleteDaoSafeWallet(id: number): Promise<boolean> {
    await db.update(daoSafeWallets).set({ isActive: false }).where(eq(daoSafeWallets.id, id));
    return true;
  }

  async getDaoSafeBalances(walletId: number): Promise<DaoSafeBalance[]> {
    return db.select().from(daoSafeBalances).where(eq(daoSafeBalances.walletId, walletId));
  }

  async upsertDaoSafeBalances(walletId: number, balances: InsertDaoSafeBalance[]): Promise<DaoSafeBalance[]> {
    // Delete existing balances for this wallet
    await db.delete(daoSafeBalances).where(eq(daoSafeBalances.walletId, walletId));
    
    if (balances.length === 0) return [];
    
    // Insert new balances
    const inserted = await db.insert(daoSafeBalances)
      .values(balances.map(b => ({ ...b, walletId })))
      .returning();
    return inserted;
  }

  async getDaoSafePendingTxs(walletId?: number): Promise<DaoSafePendingTx[]> {
    if (walletId) {
      return db.select().from(daoSafePendingTxs)
        .where(eq(daoSafePendingTxs.walletId, walletId))
        .orderBy(desc(daoSafePendingTxs.submissionDate));
    }
    return db.select().from(daoSafePendingTxs).orderBy(desc(daoSafePendingTxs.submissionDate));
  }

  async upsertDaoSafePendingTx(tx: InsertDaoSafePendingTx): Promise<DaoSafePendingTx> {
    // Check if exists
    const [existing] = await db.select().from(daoSafePendingTxs)
      .where(eq(daoSafePendingTxs.safeTxHash, tx.safeTxHash));
    
    if (existing) {
      const [updated] = await db.update(daoSafePendingTxs)
        .set({ ...tx, lastSyncedAt: new Date() })
        .where(eq(daoSafePendingTxs.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(daoSafePendingTxs).values(tx).returning();
    return created;
  }

  async deleteDaoSafePendingTx(id: number): Promise<boolean> {
    await db.delete(daoSafePendingTxs).where(eq(daoSafePendingTxs.id, id));
    return true;
  }
}

export const storage = new DbStorage();
