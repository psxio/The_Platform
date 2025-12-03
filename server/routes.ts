import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import crypto from "crypto";
import type { ComparisonResult, InsertCollection } from "@shared/schema";
import { insertInternalTeamMemberSchema, insertTeamPaymentHistorySchema } from "@shared/schema";
import { storage } from "./storage";
import { parseFile } from "./file-parser";
import { createRequire } from "module";
import { setupAuth, isAuthenticated, requireRole } from "./auth";
import { googleSheetsService } from "./google-sheets";
import { emailService } from "./email-service";
import { channelNotificationService } from "./channel-notification-service";

// Validate Ethereum address format
function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Use createRequire for pdf-parse as it doesn't have proper ESM exports
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const upload = multer({ storage: multer.memoryStorage() });

// Extract all EVM addresses from any text content
function extractEvmAddresses(content: string): string[] {
  // Use word boundary to avoid matching within longer hex strings (like bytecode or tx data)
  // This regex ensures the address stands alone and isn't part of a larger hex sequence
  const addressRegex = /(?<![a-fA-F0-9])0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/g;
  const matches = content.match(addressRegex) || [];
  
  // Remove duplicates and normalize to lowercase for consistency with comparison tool
  const seen = new Set<string>();
  const uniqueAddresses: string[] = [];
  
  for (const addr of matches) {
    const lowerAddr = addr.toLowerCase();
    // Skip addresses that are all zeros (null address pattern often in encoded data)
    if (lowerAddr === '0x0000000000000000000000000000000000000000') {
      continue;
    }
    // Skip addresses that look like padded zeros with a small value (common in ABI encoding)
    // These have lots of leading zeros followed by a few hex chars
    const withoutPrefix = lowerAddr.slice(2);
    const leadingZeros = withoutPrefix.match(/^0+/)?.[0]?.length || 0;
    if (leadingZeros >= 30) {
      // More than 30 leading zeros is likely ABI-encoded data, not a real address
      continue;
    }
    
    if (!seen.has(lowerAddr)) {
      seen.add(lowerAddr);
      uniqueAddresses.push(lowerAddr); // Return lowercase for consistency
    }
  }
  
  return uniqueAddresses;
}

// Extract text content from JSON, focusing on message/text fields (for chat exports like Telegram)
function extractTextFromJson(obj: any, depth = 0): string {
  if (depth > 10) return ''; // Prevent infinite recursion
  
  const textParts: string[] = [];
  
  if (typeof obj === 'string') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      textParts.push(extractTextFromJson(item, depth + 1));
    }
  } else if (obj && typeof obj === 'object') {
    // Only extract from fields that contain actual user content
    const textFields = ['text', 'message', 'content', 'body', 'description', 'caption', 'bio'];
    for (const field of textFields) {
      if (obj[field]) {
        if (typeof obj[field] === 'string') {
          textParts.push(obj[field]);
        } else if (Array.isArray(obj[field])) {
          // Telegram stores text as array of objects sometimes
          for (const part of obj[field]) {
            if (typeof part === 'string') {
              textParts.push(part);
            } else if (part && typeof part === 'object' && part.text) {
              textParts.push(part.text);
            }
          }
        }
      }
    }
    // Recurse into nested objects/arrays (like messages array)
    const containerFields = ['messages', 'items', 'data', 'posts', 'comments', 'replies'];
    for (const field of containerFields) {
      if (obj[field] && Array.isArray(obj[field])) {
        textParts.push(extractTextFromJson(obj[field], depth + 1));
      }
    }
  }
  
  return textParts.join('\n');
}

// Convert file buffer to text content based on file type
async function fileToText(filename: string, buffer: Buffer): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  // Handle PDF files
  if (ext === 'pdf') {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (e) {
      console.error('Error reading PDF file:', e);
      return '';
    }
  }
  
  // Handle Excel files
  if (ext === 'xlsx' || ext === 'xls') {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let allText = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        // Convert to CSV text
        allText += XLSX.utils.sheet_to_csv(sheet) + '\n';
      }
      return allText;
    } catch (e) {
      console.error('Error reading Excel file:', e);
      return '';
    }
  }
  
  // Handle JSON files (like Telegram exports) - only extract from text/message fields
  if (ext === 'json') {
    try {
      const jsonContent = JSON.parse(buffer.toString('utf-8'));
      return extractTextFromJson(jsonContent);
    } catch (e) {
      // If JSON parsing fails, treat as plain text
      return buffer.toString('utf-8');
    }
  }
  
  // For all other files, try to read as text
  return buffer.toString('utf-8');
}

// Helper function to find assignee info from multiple sources
// Returns user info if found through users table, or email string if only found in directory
interface AssigneeInfo {
  user?: { id: string; firstName: string | null; lastName: string | null; email: string };
  email?: string;
  name?: string;
}

async function findAssignee(assignedTo: string | null | undefined): Promise<AssigneeInfo | null> {
  if (!assignedTo) return null;
  
  const allUsers = await storage.getAllUsers();
  const directoryMembers = await storage.getDirectoryMembers();
  
  // 1. Check if assignedTo is a direct email address
  if (assignedTo.includes("@")) {
    const user = allUsers.find(u => u.email?.toLowerCase() === assignedTo.toLowerCase());
    if (user) {
      return { user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email! }, name: `${user.firstName} ${user.lastName}` };
    }
    // Email found but no user account - still can send email
    return { email: assignedTo, name: assignedTo.split("@")[0] };
  }
  
  // 2. Check if assignedTo matches a user's full name
  const user = allUsers.find(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase() === assignedTo.toLowerCase()
  );
  if (user && user.email) {
    return { user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email }, name: `${user.firstName} ${user.lastName}` };
  }
  
  // 3. Check directory members for email
  const directoryMember = directoryMembers.find(m => 
    m.person?.toLowerCase() === assignedTo.toLowerCase()
  );
  if (directoryMember?.email) {
    // Check if there's a user with this email
    const memberUser = allUsers.find(u => u.email?.toLowerCase() === directoryMember.email?.toLowerCase());
    if (memberUser) {
      return { user: { id: memberUser.id, firstName: memberUser.firstName, lastName: memberUser.lastName, email: memberUser.email! }, name: directoryMember.person };
    }
    return { email: directoryMember.email, name: directoryMember.person };
  }
  
  // No match found
  console.log(`[Email] Could not find email for assignee: "${assignedTo}" - consider adding email to directory member`);
  return null;
}

// Check for due tasks and send reminder notifications
async function checkDueTasks() {
  try {
    const tasks = await storage.getContentTasks();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const task of tasks) {
      if (!task.dueDate || task.status === "COMPLETED") continue;
      
      // Parse due date (supports formats like "Nov 26", "2025-11-26", etc.)
      const dueDate = parseDueDate(task.dueDate);
      if (!dueDate) continue;
      
      const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Find assignee using improved lookup
      const assigneeInfo = await findAssignee(task.assignedTo);
      
      if (!assigneeInfo) continue;
      
      // Get target email for notifications
      const targetEmail = assigneeInfo.user?.email || assigneeInfo.email;
      if (!targetEmail) continue;
      
      // Due soon (within 3 days)
      if (diffDays > 0 && diffDays <= 3) {
        let alreadyNotified = false;
        
        // Create in-app notification only if we have a user account
        if (assigneeInfo.user) {
          const existingNotification = await storage.getNotifications(assigneeInfo.user.id);
          alreadyNotified = existingNotification.some(n => 
            n.taskId === task.id && 
            n.type === "due_soon" &&
            new Date(n.createdAt!).toDateString() === today.toDateString()
          );
          
          if (!alreadyNotified) {
            await storage.createNotification({
              userId: assigneeInfo.user.id,
              type: "due_soon",
              title: "Task due soon",
              message: `"${task.description?.substring(0, 50)}..." is due in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
              taskId: task.id,
            });
          }
        }
        
        if (!alreadyNotified) {
          await emailService.sendDueSoonEmail(task, { email: targetEmail, name: assigneeInfo.name }, diffDays);
        }
      }
      
      // Overdue
      if (diffDays < 0) {
        const daysOverdue = Math.abs(diffDays);
        let alreadyNotified = false;
        
        // Create in-app notification only if we have a user account
        if (assigneeInfo.user) {
          const existingNotification = await storage.getNotifications(assigneeInfo.user.id);
          alreadyNotified = existingNotification.some(n => 
            n.taskId === task.id && 
            n.type === "overdue" &&
            new Date(n.createdAt!).toDateString() === today.toDateString()
          );
          
          if (!alreadyNotified) {
            await storage.createNotification({
              userId: assigneeInfo.user.id,
              type: "overdue",
              title: "Task is overdue",
              message: `"${task.description?.substring(0, 50)}..." is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
              taskId: task.id,
            });
          }
        }
        
        if (!alreadyNotified) {
          await emailService.sendOverdueEmail(task, { email: targetEmail, name: assigneeInfo.name }, daysOverdue);
        }
      }
    }
  } catch (error) {
    console.error("Error checking due tasks:", error);
  }
}

// Parse various date formats
function parseDueDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try ISO format first (2025-11-26)
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;
  
  // Try "Nov 26" format
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  
  const match = dateStr.match(/^(\w{3})\s+(\d{1,2})$/i);
  if (match) {
    const month = months[match[1].toLowerCase()];
    const day = parseInt(match[2]);
    if (month !== undefined && day) {
      const year = new Date().getFullYear();
      const date = new Date(year, month, day);
      // If date is in the past, assume next year
      if (date < new Date()) {
        date.setFullYear(year + 1);
      }
      return date;
    }
  }
  
  return null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  
  // Initialize email service
  await emailService.initialize();
  
  // Run due task check every hour
  setInterval(checkDueTasks, 60 * 60 * 1000);
  // Also run immediately on startup (after a short delay)
  setTimeout(checkDueTasks, 5000);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // User is already populated by isAuthenticated middleware
      const { password: _, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get comparison history
  app.get("/api/comparisons", requireRole("web3"), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const comparisons = await storage.getComparisons(limit);
      res.json(comparisons);
    } catch (error) {
      console.error("Error fetching comparisons:", error);
      res.status(500).json({
        error: "Failed to fetch comparison history",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get single comparison
  app.get("/api/comparisons/:id", requireRole("web3"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const comparison = await storage.getComparison(id);
      
      if (!comparison) {
        return res.status(404).json({ error: "Comparison not found" });
      }
      
      res.json(comparison);
    } catch (error) {
      console.error("Error fetching comparison:", error);
      res.status(500).json({
        error: "Failed to fetch comparison",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Extract EVM addresses from any file(s) - supports single file or multiple files from folder
  app.post(
    "/api/extract",
    requireRole("web3"),
    upload.array("files", 100),
    async (req, res) => {
      try {
        const files = req.files as Express.Multer.File[];
        
        if (!files || files.length === 0) {
          return res.status(400).json({ 
            error: "At least one file is required" 
          });
        }

        if (files.length > 100) {
          return res.status(400).json({ 
            error: "Maximum 100 files allowed per extraction" 
          });
        }

        // Process all files and collect addresses
        const allAddresses = new Set<string>();
        const processedFiles: string[] = [];
        let filesWithAddresses = 0;

        for (const file of files) {
          try {
            const textContent = await fileToText(file.originalname, file.buffer);
            
            if (textContent && textContent.length > 0) {
              const addresses = extractEvmAddresses(textContent);
              if (addresses.length > 0) {
                filesWithAddresses++;
                addresses.forEach(addr => allAddresses.add(addr));
              }
              processedFiles.push(file.originalname);
            }
          } catch (e) {
            console.error(`Error processing file ${file.originalname}:`, e);
            // Continue processing other files even if one fails
          }
        }

        const uniqueAddresses = Array.from(allAddresses);
        const displayName = files.length === 1 
          ? files[0].originalname 
          : `${files.length} files (${filesWithAddresses} with addresses)`;

        res.json({
          filename: displayName,
          totalFound: uniqueAddresses.length,
          addresses: uniqueAddresses,
          filesProcessed: processedFiles.length,
          filesWithAddresses: filesWithAddresses,
        });
      } catch (error) {
        console.error("Error extracting addresses:", error);
        res.status(500).json({ 
          error: "Failed to extract addresses",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  );

  // Extract EVM addresses from X (Twitter) tweets and their comments
  app.post("/api/extract-tweets", requireRole("web3"), async (req, res) => {
    try {
      const { tweetUrl } = req.body;
      
      if (!tweetUrl || typeof tweetUrl !== "string") {
        return res.status(400).json({ error: "Tweet URL is required" });
      }

      // Extract tweet ID from URL
      const tweetIdMatch = tweetUrl.match(/status\/(\d+)/);
      if (!tweetIdMatch) {
        return res.status(400).json({ error: "Invalid X (Twitter) URL format" });
      }

      const tweetId = tweetIdMatch[1];
      const bearerToken = process.env.X_API_BEARER_TOKEN;

      if (!bearerToken) {
        return res.status(500).json({ error: "X API credentials not configured" });
      }

      const allAddresses = new Set<string>();
      let totalProcessed = 0;

      // Fetch main tweet using X API v2
      const tweetResponse = await fetch(`https://api.twitter.com/2/tweets/${tweetId}`, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      });

      if (!tweetResponse.ok) {
        const error = await tweetResponse.json();
        return res.status(tweetResponse.status).json({ 
          error: "Failed to fetch tweet",
          details: error.errors?.[0]?.message || "Unknown error"
        });
      }

      const tweetData = await tweetResponse.json();
      const mainTweetText = tweetData.data?.text || "";
      
      // Extract addresses from main tweet
      const mainAddresses = extractEvmAddresses(mainTweetText);
      mainAddresses.forEach(addr => allAddresses.add(addr));
      totalProcessed += 1;

      // Fetch replies to the tweet using search API
      const searchQuery = `in_reply_to_tweet_id:${tweetId}`;
      const searchParams = new URLSearchParams({
        query: searchQuery,
        max_results: "100", // X API v2 standard tier allows up to 100 per request
        "tweet.fields": "text",
      });

      let nextToken: string | undefined;
      let repliesProcessed = 0;

      // Fetch multiple pages of replies
      for (let page = 0; page < 10; page++) { // Limit to 10 pages (1000 replies max)
        if (nextToken) {
          searchParams.set("pagination_token", nextToken);
        }

        const repliesResponse = await fetch(
          `https://api.twitter.com/2/tweets/search/recent?${searchParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          }
        );

        if (!repliesResponse.ok) {
          // If search fails, just continue with what we have
          console.error("Error fetching replies:", repliesResponse.status);
          break;
        }

        const repliesData = await repliesResponse.json();
        const tweets = repliesData.data || [];

        if (tweets.length === 0) {
          break; // No more replies
        }

        // Extract addresses from each reply
        for (const tweet of tweets) {
          const replyText = tweet.text || "";
          const replyAddresses = extractEvmAddresses(replyText);
          replyAddresses.forEach(addr => allAddresses.add(addr));
          repliesProcessed += 1;
        }

        // Check if there are more pages
        nextToken = repliesData.meta?.next_token;
        if (!nextToken) {
          break;
        }
      }

      totalProcessed += repliesProcessed;
      const uniqueAddresses = Array.from(allAddresses);

      res.json({
        filename: `Tweet ${tweetId} + ${repliesProcessed} replies`,
        totalFound: uniqueAddresses.length,
        addresses: uniqueAddresses,
        filesProcessed: totalProcessed,
        filesWithAddresses: uniqueAddresses.length > 0 ? 1 : 0,
        tweetText: mainTweetText,
      });
    } catch (error) {
      console.error("Error extracting from tweet:", error);
      res.status(500).json({ 
        error: "Failed to extract from tweet",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ================== COLLECTION MANAGEMENT ENDPOINTS ==================

  // Get all collections
  app.get("/api/collections", requireRole("web3"), async (req, res) => {
    try {
      const collections = await storage.getCollections();
      // Add address count for each collection
      const collectionsWithCounts = await Promise.all(
        collections.map(async (collection) => ({
          ...collection,
          addressCount: await storage.getMintedAddressCount(collection.id),
        }))
      );
      res.json(collectionsWithCounts);
    } catch (error) {
      console.error("Error fetching collections:", error);
      res.status(500).json({
        error: "Failed to fetch collections",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get single collection with addresses
  app.get("/api/collections/:id", requireRole("web3"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const collection = await storage.getCollection(id);
      
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }

      const addresses = await storage.getMintedAddresses(id);
      res.json({
        ...collection,
        addresses,
        addressCount: addresses.length,
      });
    } catch (error) {
      console.error("Error fetching collection:", error);
      res.status(500).json({
        error: "Failed to fetch collection",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Create new collection
  app.post("/api/collections", requireRole("web3"), async (req, res) => {
    try {
      const { name, description } = req.body;
      
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Collection name is required" });
      }

      const collection = await storage.createCollection({
        name: name.trim(),
        description: description?.trim() || null,
      });

      res.status(201).json({ ...collection, addressCount: 0 });
    } catch (error: any) {
      console.error("Error creating collection:", error);
      // Handle unique constraint violation
      if (error.code === "23505") {
        return res.status(409).json({ error: "A collection with this name already exists" });
      }
      res.status(500).json({
        error: "Failed to create collection",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Delete collection
  app.delete("/api/collections/:id", requireRole("web3"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const collection = await storage.getCollection(id);
      
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }

      await storage.deleteCollection(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting collection:", error);
      res.status(500).json({
        error: "Failed to delete collection",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Add addresses to collection (from text/paste)
  app.post("/api/collections/:id/addresses", requireRole("web3"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { addresses } = req.body;
      
      const collection = await storage.getCollection(id);
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }

      if (!addresses || !Array.isArray(addresses)) {
        return res.status(400).json({ error: "Addresses array is required" });
      }

      // Validate and filter addresses
      const validAddresses: string[] = [];
      const invalidAddresses: { address: string; error: string }[] = [];

      for (const addr of addresses) {
        if (typeof addr !== "string") continue;
        const trimmed = addr.trim();
        if (!trimmed) continue;
        
        if (isValidEvmAddress(trimmed)) {
          validAddresses.push(trimmed.toLowerCase());
        } else {
          invalidAddresses.push({ address: trimmed, error: "Invalid EVM address format" });
        }
      }

      const addedCount = await storage.addMintedAddresses(id, validAddresses);
      const totalCount = await storage.getMintedAddressCount(id);

      res.json({
        added: addedCount,
        skipped: validAddresses.length - addedCount,
        invalid: invalidAddresses.length,
        totalInCollection: totalCount,
        invalidAddresses: invalidAddresses.slice(0, 10), // Return first 10 invalid
      });
    } catch (error) {
      console.error("Error adding addresses:", error);
      res.status(500).json({
        error: "Failed to add addresses",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Upload file to add addresses to collection
  app.post(
    "/api/collections/:id/upload",
    requireRole("web3"),
    upload.single("file"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const file = req.file;
        
        const collection = await storage.getCollection(id);
        if (!collection) {
          return res.status(404).json({ error: "Collection not found" });
        }

        if (!file) {
          return res.status(400).json({ error: "File is required" });
        }

        // Parse file to extract addresses
        const parsed = parseFile(file.originalname, file.buffer);
        const validAddresses = parsed.addresses.map(a => a.address.toLowerCase());

        const addedCount = await storage.addMintedAddresses(id, validAddresses);
        const totalCount = await storage.getMintedAddressCount(id);

        res.json({
          filename: file.originalname,
          found: parsed.addresses.length,
          added: addedCount,
          skipped: validAddresses.length - addedCount,
          invalid: parsed.invalidCount,
          totalInCollection: totalCount,
        });
      } catch (error) {
        console.error("Error uploading file to collection:", error);
        res.status(500).json({
          error: "Failed to upload file",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Remove address from collection
  app.delete("/api/collections/:id/addresses/:address", requireRole("web3"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const address = req.params.address;
      
      const collection = await storage.getCollection(id);
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }

      await storage.removeMintedAddress(id, address);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing address:", error);
      res.status(500).json({
        error: "Failed to remove address",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Download collection addresses as CSV
  app.get("/api/collections/:id/download", requireRole("web3"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const collection = await storage.getCollection(id);
      
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }

      const addresses = await storage.getMintedAddresses(id);
      const csv = addresses.join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${collection.name}_minted_addresses.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error downloading collection:", error);
      res.status(500).json({
        error: "Failed to download collection",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ================== COMPARE WITH COLLECTION ==================

  // Compare eligible addresses against a stored collection
  app.post(
    "/api/compare-collection",
    requireRole("web3"),
    upload.single("eligible"),
    async (req, res) => {
      try {
        const file = req.file;
        const collectionId = parseInt(req.body.collectionId);
        
        if (!file) {
          return res.status(400).json({ error: "Eligible file is required" });
        }

        if (!collectionId || isNaN(collectionId)) {
          return res.status(400).json({ error: "Collection ID is required" });
        }

        const collection = await storage.getCollection(collectionId);
        if (!collection) {
          return res.status(404).json({ error: "Collection not found" });
        }

        // Get minted addresses from collection
        const mintedAddresses = await storage.getMintedAddresses(collectionId);
        const mintedSet = new Set(mintedAddresses.map(addr => addr.toLowerCase()));

        // Parse eligible file
        const eligibleParsed = parseFile(file.originalname, file.buffer);

        // Filter eligible addresses that are NOT in the minted set
        const notMinted = eligibleParsed.addresses.filter(
          addr => !mintedSet.has(addr.address.toLowerCase())
        );

        const result: ComparisonResult = {
          notMinted,
          stats: {
            totalEligible: eligibleParsed.addresses.length,
            totalMinted: mintedAddresses.length,
            remaining: notMinted.length,
            invalidAddresses: eligibleParsed.invalidCount > 0 ? eligibleParsed.invalidCount : undefined,
          },
          validationErrors: eligibleParsed.validationErrors.length > 0 
            ? eligibleParsed.validationErrors 
            : undefined,
        };

        // Save comparison to database with collection reference
        await storage.createComparison({
          collectionId: collectionId,
          mintedFileName: `Collection: ${collection.name}`,
          eligibleFileName: file.originalname,
          totalEligible: result.stats.totalEligible,
          totalMinted: result.stats.totalMinted,
          remaining: result.stats.remaining,
          invalidAddresses: result.stats.invalidAddresses || null,
          results: result as any,
        });

        res.json(result);
      } catch (error) {
        console.error("Error comparing with collection:", error);
        res.status(500).json({
          error: "Failed to compare with collection",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ================== ORIGINAL FILE COMPARE ENDPOINT ==================

  app.post(
    "/api/compare",
    requireRole("web3"),
    upload.fields([
      { name: "minted", maxCount: 1 },
      { name: "eligible", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        if (!files.minted || !files.eligible) {
          return res.status(400).json({ 
            error: "Both files are required" 
          });
        }

        const mintedFile = files.minted[0];
        const eligibleFile = files.eligible[0];

        // Use the unified parser that supports CSV, JSON, and Excel
        const mintedParsed = parseFile(mintedFile.originalname, mintedFile.buffer);
        const eligibleParsed = parseFile(eligibleFile.originalname, eligibleFile.buffer);

        // Create a Set of minted addresses for fast lookup (case-insensitive)
        const mintedSet = new Set(
          mintedParsed.addresses.map(addr => addr.address.toLowerCase())
        );

        // Filter eligible addresses that are NOT in the minted set
        const notMinted = eligibleParsed.addresses.filter(
          addr => !mintedSet.has(addr.address.toLowerCase())
        );

        // Combine validation errors from both files
        const allValidationErrors = [
          ...mintedParsed.validationErrors.map(e => ({ ...e, file: 'minted' as const })),
          ...eligibleParsed.validationErrors.map(e => ({ ...e, file: 'eligible' as const })),
        ];

        const totalInvalid = mintedParsed.invalidCount + eligibleParsed.invalidCount;

        const result: ComparisonResult = {
          notMinted,
          stats: {
            totalEligible: eligibleParsed.addresses.length,
            totalMinted: mintedParsed.addresses.length,
            remaining: notMinted.length,
            invalidAddresses: totalInvalid > 0 ? totalInvalid : undefined,
          },
          validationErrors: allValidationErrors.length > 0 ? allValidationErrors : undefined,
        };

        // Save comparison to database
        await storage.createComparison({
          mintedFileName: mintedFile.originalname,
          eligibleFileName: eligibleFile.originalname,
          totalEligible: result.stats.totalEligible,
          totalMinted: result.stats.totalMinted,
          remaining: result.stats.remaining,
          invalidAddresses: result.stats.invalidAddresses || null,
          results: result as any,
        });

        res.json(result);
      } catch (error) {
        console.error("Error processing files:", error);
        res.status(500).json({ 
          error: "Failed to process files",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  );

  // Compare eligible file against a stored collection of minted addresses
  app.post(
    "/api/compare-collection",
    upload.single("eligible"),
    async (req, res) => {
      try {
        const collectionId = req.body.collectionId;
        
        if (!req.file) {
          return res.status(400).json({ error: "Eligible file is required" });
        }
        
        if (!collectionId) {
          return res.status(400).json({ error: "Collection ID is required" });
        }
        
        const collection = await storage.getCollection(parseInt(collectionId));
        if (!collection) {
          return res.status(404).json({ error: "Collection not found" });
        }
        
        // Get minted addresses from the collection
        const mintedAddresses = await storage.getMintedAddresses(parseInt(collectionId));
        
        // Parse the eligible file
        const eligibleParsed = parseFile(req.file.originalname, req.file.buffer);
        
        // Create a Set of minted addresses for fast lookup (case-insensitive)
        const mintedSet = new Set(
          mintedAddresses.map(addr => addr.toLowerCase())
        );
        
        // Filter eligible addresses that are NOT in the minted set
        const notMinted = eligibleParsed.addresses.filter(
          addr => !mintedSet.has(addr.address.toLowerCase())
        );
        
        const result: ComparisonResult = {
          notMinted,
          stats: {
            totalEligible: eligibleParsed.addresses.length,
            totalMinted: mintedAddresses.length,
            remaining: notMinted.length,
            invalidAddresses: eligibleParsed.invalidCount > 0 ? eligibleParsed.invalidCount : undefined,
          },
          validationErrors: eligibleParsed.validationErrors.length > 0 
            ? eligibleParsed.validationErrors.map(e => ({ ...e, file: 'eligible' as const })) 
            : undefined,
        };
        
        // Save comparison to database with collectionId reference
        await storage.createComparison({
          collectionId: parseInt(collectionId),
          mintedFileName: `${collection.name} (Collection)`,
          eligibleFileName: req.file.originalname,
          totalEligible: result.stats.totalEligible,
          totalMinted: result.stats.totalMinted,
          remaining: result.stats.remaining,
          invalidAddresses: result.stats.invalidAddresses || null,
          results: result as any,
        });
        
        res.json(result);
      } catch (error) {
        console.error("Error processing collection comparison:", error);
        res.status(500).json({
          error: "Failed to process comparison",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  );

  // ================== TO-DO TASK ENDPOINTS ==================

  // Get current user's tasks (requires auth)
  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tasks = await storage.getUserTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get public tasks (no auth required)
  app.get("/api/tasks/public", async (req, res) => {
    try {
      const tasks = await storage.getPublicTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching public tasks:", error);
      res.status(500).json({ error: "Failed to fetch public tasks" });
    }
  });

  // Create new task (requires auth)
  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { title } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }
      const task = await storage.createTask(userId, title);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // Update task status (requires auth, must be owner)
  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const { status, isPublic } = req.body;
      
      let task;
      if (status !== undefined) {
        task = await storage.updateTaskStatus(id, userId, status);
      }
      if (isPublic !== undefined) {
        task = await storage.updateTaskPublic(id, userId, isPublic);
      }
      
      if (!task) {
        return res.status(404).json({ error: "Task not found or not authorized" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Delete task (requires auth, must be owner)
  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      await storage.deleteTask(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Shared parsing function for bulk import
  function parseBulkTasks(rawText: string, tasksPerDay: number, excludeIndices: number[] = []) {
    const lines = rawText.split("\n");
    const parsedTasks: Array<{ title: string; projectTag?: string; dueDate?: string; originalIndex: number }> = [];
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(0, 0, 0, 0);
    
    let currentDate = new Date(startDate);
    let tasksOnCurrentDay = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      
      // Skip if this index was removed by user
      if (excludeIndices.includes(i)) continue;
      
      const bracketMatch = trimmed.match(/^\[([^\]]+)\]\s*(.+)$/);
      let projectTag: string | undefined;
      let title: string;
      
      if (bracketMatch) {
        projectTag = bracketMatch[1].trim();
        title = bracketMatch[2].trim();
      } else {
        title = trimmed;
      }
      
      if (!title) continue;
      
      if (tasksOnCurrentDay >= tasksPerDay) {
        currentDate.setDate(currentDate.getDate() + 1);
        tasksOnCurrentDay = 0;
      }
      
      const dueDate = currentDate.toISOString().split("T")[0];
      tasksOnCurrentDay++;
      
      parsedTasks.push({ title, projectTag, dueDate, originalIndex: i });
    }
    
    return parsedTasks;
  }

  // Bulk import tasks with smart day spacing (requires auth)
  app.post("/api/tasks/bulk-import", isAuthenticated, async (req: any, res) => {
    try {
      let { rawText, tasksPerDay = 3 } = req.body;
      
      if (!rawText || typeof rawText !== "string") {
        return res.status(400).json({ error: "Raw text is required" });
      }
      
      // Validate and clamp tasksPerDay
      tasksPerDay = Math.max(1, Math.min(10, parseInt(tasksPerDay) || 3));
      
      const parsedTasks = parseBulkTasks(rawText, tasksPerDay);
      
      if (parsedTasks.length === 0) {
        return res.status(400).json({ error: "No valid tasks found in the text" });
      }
      
      // Return parsed preview (don't save yet)
      res.json({ 
        preview: parsedTasks,
        totalTasks: parsedTasks.length,
        daysSpanned: Math.ceil(parsedTasks.length / tasksPerDay)
      });
    } catch (error) {
      console.error("Error parsing bulk tasks:", error);
      res.status(500).json({ error: "Failed to parse tasks" });
    }
  });

  // Confirm and save bulk imported tasks - re-parses server-side for security
  app.post("/api/tasks/bulk-import/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      let { rawText, tasksPerDay = 3, excludeIndices = [] } = req.body;
      
      if (!rawText || typeof rawText !== "string") {
        return res.status(400).json({ error: "Raw text is required for confirmation" });
      }
      
      // Validate and clamp tasksPerDay
      tasksPerDay = Math.max(1, Math.min(10, parseInt(tasksPerDay) || 3));
      
      // Validate excludeIndices is an array of numbers
      if (!Array.isArray(excludeIndices)) {
        excludeIndices = [];
      }
      excludeIndices = excludeIndices.filter((i: any) => typeof i === 'number' && i >= 0);
      
      // Re-parse the raw text server-side using the same shared function
      const parsedTasks = parseBulkTasks(rawText, tasksPerDay, excludeIndices);
      
      if (parsedTasks.length === 0) {
        return res.status(400).json({ error: "No valid tasks to import" });
      }
      
      // Remove originalIndex before saving
      const tasksToSave = parsedTasks.map(({ title, projectTag, dueDate }) => ({ title, projectTag, dueDate }));
      
      const createdTasks = await storage.createTasksBulk(userId, tasksToSave);
      res.json({ 
        success: true, 
        createdCount: createdTasks.length,
        tasks: createdTasks 
      });
    } catch (error) {
      console.error("Error saving bulk tasks:", error);
      res.status(500).json({ error: "Failed to save tasks" });
    }
  });

  // ================== USER ROLE ENDPOINTS ==================

  // Generate random invite code
  function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Update user role - ALL roles require valid invite codes
  // Content role users go into "pending" state until admin approves them
  app.patch("/api/auth/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { role, inviteCode } = req.body;
      
      if (!role || !["web3", "content", "admin"].includes(role)) {
        return res.status(400).json({ error: "Valid role is required (web3, content, or admin)" });
      }
      
      // Get the current user to check for bootstrap admin
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check for bootstrap admin email (super admin bypass for initial setup)
      const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
      const isBootstrapAdmin = role === "admin" && 
                               bootstrapAdminEmail && 
                               currentUser.email.toLowerCase() === bootstrapAdminEmail.toLowerCase();
      
      let validCodeRecord = null;
      
      if (isBootstrapAdmin) {
        // Bootstrap admin can set their role without a code
        console.log(`Bootstrap admin access granted to ${currentUser.email}`);
      } else {
        // All other users require a valid invite code
        if (!inviteCode) {
          return res.status(400).json({ error: `Invite code is required for ${role} access` });
        }
        
        // Check for initial admin code from environment variable (admin only)
        const initialAdminCode = process.env.INITIAL_ADMIN_CODE;
        if (role === "admin" && initialAdminCode && inviteCode === initialAdminCode) {
          // Use the initial code - it can only be used once
          // After first use, they should generate codes for others
        } else {
          // Check database for valid invite code for the requested role
          validCodeRecord = await storage.getValidInviteCode(inviteCode, role);
          if (!validCodeRecord) {
            return res.status(400).json({ error: `Invalid or expired invite code for ${role} access` });
          }
          
          // Mark the code as used and record the usage details
          await storage.useInviteCode(inviteCode, userId, role);
        }
      }
      
      // For content role, create a pending content member entry instead of granting immediate access
      if (role === "content" && !isBootstrapAdmin) {
        // Check if user already has a pending entry
        const existingPending = await storage.getPendingContentMember(userId);
        if (!existingPending) {
          // Create pending content member entry
          await storage.createPendingContentMember({
            userId,
            inviteCodeId: validCodeRecord?.id || null,
            status: "pending",
          });
        }
        
        // Still set the role to "content" but they won't have access until approved
        const user = await storage.updateUserRole(userId, role);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        
        // Return with pending status info
        return res.json({
          ...user,
          contentAccessStatus: "pending",
          message: "Your content access request has been submitted. An admin will review it shortly."
        });
      }
      
      const user = await storage.updateUserRole(userId, role);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // ================== INVITE CODE ENDPOINTS ==================
  // These require admin role

  // Generate new invite code (admins only)
  app.post("/api/admin/invite-codes", requireRole("admin"), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can generate invite codes" });
      }
      
      const { forRole, maxUses, expiresAt } = req.body;
      if (!forRole || !["web3", "content", "admin"].includes(forRole)) {
        return res.status(400).json({ error: "Valid role is required (web3, content, or admin)" });
      }
      
      // Parse maxUses: null = unlimited, number = limited uses
      let parsedMaxUses: number | null = 1;
      if (maxUses === null || maxUses === "unlimited") {
        parsedMaxUses = null;
      } else if (typeof maxUses === "number" && maxUses > 0) {
        parsedMaxUses = maxUses;
      }
      
      // Parse expiresAt: null = never, string = parse as date
      let parsedExpiresAt: Date | null = null;
      if (expiresAt) {
        parsedExpiresAt = new Date(expiresAt);
        if (isNaN(parsedExpiresAt.getTime())) {
          return res.status(400).json({ error: "Invalid expiration date" });
        }
      }
      
      const code = generateInviteCode();
      const inviteCode = await storage.createInviteCode(code, forRole, req.user.id, parsedMaxUses, parsedExpiresAt);
      
      res.status(201).json(inviteCode);
    } catch (error) {
      console.error("Error generating invite code:", error);
      res.status(500).json({ error: "Failed to generate invite code" });
    }
  });

  // Get admin's generated invite codes (admins only)
  app.get("/api/admin/invite-codes", requireRole("admin"), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can view invite codes" });
      }
      
      // Return invite codes with detailed usage information
      const codesWithUses = await storage.getInviteCodesWithUses(req.user.id);
      res.json(codesWithUses);
    } catch (error) {
      console.error("Error fetching invite codes:", error);
      res.status(500).json({ error: "Failed to fetch invite codes" });
    }
  });

  // Deactivate an invite code (admins only)
  app.delete("/api/admin/invite-codes/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can deactivate invite codes" });
      }
      
      const id = parseInt(req.params.id);
      const success = await storage.deactivateInviteCode(id);
      
      if (!success) {
        return res.status(404).json({ error: "Invite code not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deactivating invite code:", error);
      res.status(500).json({ error: "Failed to deactivate invite code" });
    }
  });

  // Check if current user is a bootstrap admin (no invite code required)
  app.get("/api/auth/bootstrap-check", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.json({ isBootstrapAdmin: false });
      }
      
      const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
      const isBootstrapAdmin = bootstrapAdminEmail && 
                               user.email.toLowerCase() === bootstrapAdminEmail.toLowerCase();
      
      res.json({ isBootstrapAdmin });
    } catch (error) {
      console.error("Error checking bootstrap admin:", error);
      res.json({ isBootstrapAdmin: false });
    }
  });

  // Validate an invite code (for frontend validation before submitting)
  app.post("/api/admin/validate-code", async (req, res) => {
    try {
      const { code, forRole } = req.body;
      
      if (!code) {
        return res.status(400).json({ valid: false, error: "Code is required" });
      }
      
      // Check initial admin code (admin only)
      if (forRole === "admin") {
        const initialAdminCode = process.env.INITIAL_ADMIN_CODE;
        if (initialAdminCode && code === initialAdminCode) {
          return res.json({ valid: true, role: "admin" });
        }
      }
      
      // Check database for role-specific code
      if (forRole) {
        const validCode = await storage.getValidInviteCode(code, forRole);
        return res.json({ valid: !!validCode, role: validCode?.forRole });
      }
      
      // Check database for any valid code (returns the role it's for)
      const validCode = await storage.getValidInviteCodeAnyRole(code);
      res.json({ valid: !!validCode, role: validCode?.forRole });
    } catch (error) {
      console.error("Error validating code:", error);
      res.status(500).json({ valid: false, error: "Failed to validate code" });
    }
  });

  // ================== CONTENT ACCESS APPROVAL ENDPOINTS ==================
  
  // Get current user's content access status
  app.get("/api/auth/content-access-status", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Only content users have pending status
      if (user.role !== "content") {
        return res.json({ status: "not_applicable", role: user.role });
      }
      
      // Check pending content member status
      const pendingMember = await storage.getPendingContentMember(req.user.id);
      
      // Check if user is in the directory (required for full access)
      const directoryMember = user.email ? await storage.getDirectoryMemberByEmail(user.email) : null;
      
      if (!pendingMember) {
        // No pending record - check if they're in the directory or have a completed profile (legacy users)
        const profile = await storage.getContentProfile(req.user.id);
        
        // Legacy path: users with completed profiles from before approval workflow are grandfathered in
        if (profile?.isProfileComplete) {
          return res.json({ status: "approved", profileComplete: true, inDirectory: !!directoryMember });
        }
        
        // They're in the directory - approve but need profile setup
        if (directoryMember) {
          return res.json({ status: "approved", profileComplete: false, needsProfile: true, inDirectory: true });
        }
        
        // User bypassed the approval system entirely - they have content role but no pending record, no directory entry, and no completed profile
        // Treat them as needing to be added to the pending queue by an admin
        return res.json({ status: "no_record", message: "Contact an administrator to complete your onboarding." });
      }
      
      // Check profile completion status if approved
      if (pendingMember.status === "approved") {
        const profile = await storage.getContentProfile(req.user.id);
        
        // Create a notification for users with incomplete profiles (once per day max)
        if (!profile?.isProfileComplete) {
          try {
            // Check if we already sent a reminder today
            const existingNotifications = await storage.getNotifications(req.user.id);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            
            const alreadyNotifiedToday = existingNotifications.some(n => {
              if (n.type !== "profile_incomplete" || !n.createdAt) return false;
              const notifDate = new Date(n.createdAt);
              return notifDate.getTime() >= todayStart.getTime();
            });
            
            if (!alreadyNotifiedToday) {
              await storage.createNotification({
                userId: req.user.id,
                type: "profile_incomplete",
                title: "Complete Your Profile",
                message: "Please complete your profile with your specialty, timezone, and availability so you can be assigned tasks.",
                link: "/content/profile",
              });
            }
          } catch (notifError) {
            console.error("Error creating profile incomplete notification:", notifError);
          }
        }
        
        return res.json({
          status: "approved",
          profileComplete: profile?.isProfileComplete || false,
          needsProfile: !profile?.isProfileComplete,
        });
      }
      
      return res.json({
        status: pendingMember.status,
        createdAt: pendingMember.createdAt,
        reviewNotes: pendingMember.reviewNotes,
      });
    } catch (error) {
      console.error("Error checking content access status:", error);
      res.status(500).json({ error: "Failed to check access status" });
    }
  });

  // Get all pending content members (admin only)
  app.get("/api/admin/pending-content-members", requireRole("admin"), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can view pending members" });
      }
      
      const pendingMembers = await storage.getPendingContentMembers();
      
      // Join with user data for display
      const membersWithUserData = await Promise.all(
        pendingMembers.map(async (member) => {
          const memberUser = await storage.getUser(member.userId);
          return {
            ...member,
            user: memberUser ? {
              id: memberUser.id,
              email: memberUser.email,
              firstName: memberUser.firstName,
              lastName: memberUser.lastName,
            } : null,
          };
        })
      );
      
      res.json(membersWithUserData);
    } catch (error) {
      console.error("Error fetching pending content members:", error);
      res.status(500).json({ error: "Failed to fetch pending members" });
    }
  });

  // Approve a pending content member (admin only)
  app.post("/api/admin/pending-content-members/:userId/approve", requireRole("admin"), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can approve members" });
      }
      
      const { userId } = req.params;
      const { reviewNotes, addToDirectory } = req.body;
      
      // Approve the pending member
      const approvedMember = await storage.approvePendingContentMember(userId, req.user.id, reviewNotes);
      if (!approvedMember) {
        return res.status(404).json({ error: "Pending member not found" });
      }
      
      // Get user data for directory
      const memberUser = await storage.getUser(userId);
      
      // Optionally add to team directory
      if (addToDirectory && memberUser) {
        const fullName = [memberUser.firstName, memberUser.lastName].filter(Boolean).join(" ") || memberUser.email;
        await storage.createDirectoryMember({
          person: fullName,
          email: memberUser.email,
          skill: approvedMember.specialty || undefined,
        });
      }
      
      // Create a content profile for the user
      await storage.createContentProfile({
        userId,
        specialty: approvedMember.specialty,
        contactHandle: approvedMember.contactHandle,
        portfolioUrl: approvedMember.portfolioUrl,
        timezone: approvedMember.timezone,
        availability: approvedMember.availability,
        isProfileComplete: false, // They still need to complete full profile
      });
      
      // Create a notification for the user
      await storage.createNotification({
        userId,
        type: "approval",
        title: "Content Access Approved",
        message: "Your content access has been approved! Please complete your profile to start using ContentFlowStudio.",
      });
      
      res.json({ success: true, member: approvedMember });
    } catch (error) {
      console.error("Error approving content member:", error);
      res.status(500).json({ error: "Failed to approve member" });
    }
  });

  // Reject a pending content member (admin only)
  app.post("/api/admin/pending-content-members/:userId/reject", requireRole("admin"), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can reject members" });
      }
      
      const { userId } = req.params;
      const { reviewNotes } = req.body;
      
      const rejectedMember = await storage.rejectPendingContentMember(userId, req.user.id, reviewNotes);
      if (!rejectedMember) {
        return res.status(404).json({ error: "Pending member not found" });
      }
      
      // Create a notification for the user
      await storage.createNotification({
        userId,
        type: "rejection",
        title: "Content Access Request",
        message: reviewNotes || "Your content access request was not approved. Please contact an admin for more information.",
      });
      
      res.json({ success: true, member: rejectedMember });
    } catch (error) {
      console.error("Error rejecting content member:", error);
      res.status(500).json({ error: "Failed to reject member" });
    }
  });

  // Get ALL content users with their complete status (admin only)
  // This shows everyone with content role, including those who bypassed the pending system
  app.get("/api/admin/content-users", requireRole("admin"), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can view content users" });
      }
      
      // Get all users with content role
      const allUsers = await storage.getAllUsers();
      const contentUsers = allUsers.filter(u => u.role === "content");
      
      // Get all pending members, directory members, and profiles
      const pendingMembers = await storage.getPendingContentMembers();
      const directoryMembers = await storage.getDirectoryMembers();
      const profiles = await Promise.all(
        contentUsers.map(u => storage.getContentProfile(u.id))
      );
      
      // Build complete status for each content user
      const contentUsersWithStatus = contentUsers.map((contentUser, index) => {
        const pendingRecord = pendingMembers.find(p => p.userId === contentUser.id);
        const directoryRecord = directoryMembers.find(
          d => d.email?.toLowerCase() === contentUser.email?.toLowerCase()
        );
        const profile = profiles[index];
        
        let accessStatus: "pending" | "approved" | "rejected" | "bypassed" = "bypassed";
        if (pendingRecord) {
          accessStatus = pendingRecord.status as "pending" | "approved" | "rejected";
        } else {
          // No pending record - check for legacy approval (completed profile or directory)
          if (profile?.isProfileComplete || directoryRecord) {
            accessStatus = "approved";
          }
        }
        
        return {
          id: contentUser.id,
          email: contentUser.email,
          firstName: contentUser.firstName,
          lastName: contentUser.lastName,
          createdAt: contentUser.createdAt,
          accessStatus,
          pendingRecord: pendingRecord || null,
          isInDirectory: !!directoryRecord,
          directoryId: directoryRecord?.id || null,
          hasProfile: !!profile,
          isProfileComplete: profile?.isProfileComplete || false,
        };
      });
      
      res.json(contentUsersWithStatus);
    } catch (error) {
      console.error("Error fetching content users:", error);
      res.status(500).json({ error: "Failed to fetch content users" });
    }
  });

  // Backfill pending records for content users who bypassed the system (admin only)
  app.post("/api/admin/content-users/backfill-pending", requireRole("admin"), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can backfill pending records" });
      }
      
      // Get all content users without pending records
      const allUsers = await storage.getAllUsers();
      const contentUsers = allUsers.filter(u => u.role === "content");
      const pendingMembers = await storage.getPendingContentMembers();
      
      const usersWithoutPending = contentUsers.filter(
        u => !pendingMembers.find(p => p.userId === u.id)
      );
      
      // Create pending records for users who bypassed
      const created = [];
      for (const contentUser of usersWithoutPending) {
        try {
          await storage.createPendingContentMember({
            userId: contentUser.id,
            inviteCodeId: null,
            status: "pending",
          });
          created.push(contentUser.id);
        } catch (err) {
          console.error(`Failed to create pending record for ${contentUser.id}:`, err);
        }
      }
      
      res.json({ 
        success: true, 
        backfilledCount: created.length,
        totalContentUsers: contentUsers.length,
        message: `Created ${created.length} pending records for users who bypassed the system.`
      });
    } catch (error) {
      console.error("Error backfilling pending records:", error);
      res.status(500).json({ error: "Failed to backfill pending records" });
    }
  });

  // Add content user directly to directory (admin only) - for users who bypassed system
  app.post("/api/admin/content-users/:userId/add-to-directory", requireRole("admin"), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can add users to directory" });
      }
      
      const { userId } = req.params;
      const { skill } = req.body;
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if already in directory
      const directoryMembers = await storage.getDirectoryMembers();
      const existingEntry = directoryMembers.find(
        d => d.email?.toLowerCase() === targetUser.email?.toLowerCase()
      );
      
      if (existingEntry) {
        return res.status(400).json({ error: "User is already in the team directory" });
      }
      
      const fullName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") || targetUser.email;
      const directoryMember = await storage.createDirectoryMember({
        person: fullName,
        email: targetUser.email,
        skill: skill || undefined,
      });
      
      // Also create/update their pending record to "approved" if they have one
      const pendingRecord = await storage.getPendingContentMember(userId);
      if (pendingRecord && pendingRecord.status === "pending") {
        await storage.approvePendingContentMember(userId, req.user.id, "Manually added to directory by admin");
      } else if (!pendingRecord) {
        // Create an approved pending record
        await storage.createPendingContentMember({
          userId,
          inviteCodeId: null,
          status: "pending",
        });
        await storage.approvePendingContentMember(userId, req.user.id, "Manually added to directory by admin");
      }
      
      // Create content profile if doesn't exist
      const profile = await storage.getContentProfile(userId);
      if (!profile) {
        await storage.createContentProfile({
          userId,
          specialty: skill || null,
          isProfileComplete: false,
        });
      }
      
      res.json({ 
        success: true, 
        directoryMember,
        message: `${fullName} has been added to the team directory.`
      });
    } catch (error) {
      console.error("Error adding user to directory:", error);
      res.status(500).json({ error: "Failed to add user to directory" });
    }
  });

  // Get specific user's profile details (admin only)
  app.get("/api/admin/content-users/:userId/profile", requireRole("admin"), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get content profile
      const profile = await storage.getContentProfile(userId);
      
      // Get directory member info if exists
      const directoryMembers = await storage.getDirectoryMembers();
      const directoryMember = directoryMembers.find(
        d => d.email?.toLowerCase() === targetUser.email?.toLowerCase()
      );
      
      // Get pending content member info if exists
      const pendingRecord = await storage.getPendingContentMember(userId);
      
      res.json({
        user: {
          id: targetUser.id,
          email: targetUser.email,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          profileImageUrl: targetUser.profileImageUrl,
          createdAt: targetUser.createdAt,
        },
        profile: profile || null,
        directoryMember: directoryMember || null,
        pendingRecord: pendingRecord || null,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // ================== CONTENT PROFILE ENDPOINTS ==================
  
  // Get current user's content profile
  app.get("/api/content-profile", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await storage.getContentProfile(req.user.id);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching content profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Create or update content profile
  app.post("/api/content-profile", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || (user.role !== "content" && user.role !== "admin")) {
        return res.status(403).json({ error: "Only content users can update their profile" });
      }
      
      const { specialty, contactHandle, contactType, portfolioUrl, timezone, availability, bio } = req.body;
      
      // Check if required fields are filled to mark profile as complete
      const isProfileComplete = !!(specialty && contactHandle && timezone);
      
      const existingProfile = await storage.getContentProfile(req.user.id);
      
      if (existingProfile) {
        const updatedProfile = await storage.updateContentProfile(req.user.id, {
          specialty,
          contactHandle,
          contactType,
          portfolioUrl,
          timezone,
          availability,
          bio,
          isProfileComplete,
        });
        res.json(updatedProfile);
      } else {
        const newProfile = await storage.createContentProfile({
          userId: req.user.id,
          specialty,
          contactHandle,
          contactType,
          portfolioUrl,
          timezone,
          availability,
          bio,
          isProfileComplete,
        });
        res.json(newProfile);
      }
    } catch (error) {
      console.error("Error updating content profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // ================== CONTENT TASK ENDPOINTS (ContentFlowStudio) ==================
  // These require "content" or "admin" role

  // Get internal projects list
  app.get("/api/internal-projects", requireRole("content"), async (req, res) => {
    try {
      const { internalProjects } = await import("@shared/schema");
      res.json(internalProjects);
    } catch (error) {
      console.error("Error fetching internal projects:", error);
      res.status(500).json({ error: "Failed to fetch internal projects" });
    }
  });

  // Get all content tasks
  app.get("/api/content-tasks", requireRole("content"), async (req, res) => {
    try {
      const tasks = await storage.getContentTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching content tasks:", error);
      res.status(500).json({ error: "Failed to fetch content tasks" });
    }
  });

  // Get single content task
  app.get("/api/content-tasks/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getContentTask(id);
      if (!task) {
        return res.status(404).json({ error: "Content task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching content task:", error);
      res.status(500).json({ error: "Failed to fetch content task" });
    }
  });

  // Create content task
  app.post("/api/content-tasks", requireRole("content"), async (req: any, res) => {
    try {
      const { description, status, assignedTo, dueDate, assignedBy, client, clientType, internalProject, deliverable, notes, priority, campaignId } = req.body;
      
      if (!description || typeof description !== "string") {
        return res.status(400).json({ error: "Description is required" });
      }
      
      const task = await storage.createContentTask({
        description,
        status: status || "TO BE STARTED",
        assignedTo: assignedTo || undefined,
        dueDate: dueDate || undefined,
        assignedBy: assignedBy || undefined,
        client: clientType === "internal" ? undefined : (client || undefined),
        clientType: clientType || "external",
        internalProject: clientType === "internal" ? (internalProject || undefined) : undefined,
        deliverable: deliverable || undefined,
        notes: notes || undefined,
        priority: priority || "medium",
        campaignId: campaignId || undefined,
      });
      
      // Log activity
      await storage.createActivityLog({
        taskId: task.id,
        userId: (req as any).user?.id,
        action: "created",
        details: { description: task.description },
      });
      
      // Send email notification if task is assigned
      if (task.assignedTo) {
        const assigneeInfo = await findAssignee(task.assignedTo);
        
        if (assigneeInfo) {
          // Create in-app notification only if we have a user account
          if (assigneeInfo.user && assigneeInfo.user.id !== (req as any).user?.id) {
            await storage.createNotification({
              userId: assigneeInfo.user.id,
              type: "assignment",
              title: "New task assigned",
              message: task.description?.substring(0, 100),
              taskId: task.id,
            });
          }
          
          // Send email notification (works with user or directory member email)
          const targetEmail = assigneeInfo.user?.email || assigneeInfo.email;
          if (targetEmail && assigneeInfo.user?.id !== (req as any).user?.id) {
            await emailService.sendTaskAssignmentEmail(
              task,
              { email: targetEmail, name: assigneeInfo.name },
              assignedBy || (req as any).user?.firstName || "Someone"
            );
          }
        }
      }
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating content task:", error);
      res.status(500).json({ error: "Failed to create content task" });
    }
  });

  // Update content task
  app.put("/api/content-tasks/:id", requireRole("content"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Get existing task for comparison
      const existingTask = await storage.getContentTask(id);
      if (!existingTask) {
        return res.status(404).json({ error: "Content task not found" });
      }
      
      const task = await storage.updateContentTask(id, updates);
      if (!task) {
        return res.status(404).json({ error: "Content task not found" });
      }
      
      // Log specific changes
      const userId = (req as any).user?.id;
      
      if (existingTask.status !== task.status) {
        await storage.createActivityLog({
          taskId: id,
          userId,
          action: "status_changed",
          details: { from: existingTask.status, to: task.status },
        });
      }
      
      if (existingTask.priority !== task.priority) {
        await storage.createActivityLog({
          taskId: id,
          userId,
          action: "priority_changed",
          details: { from: existingTask.priority, to: task.priority },
        });
      }
      
      if (existingTask.assignedTo !== task.assignedTo) {
        await storage.createActivityLog({
          taskId: id,
          userId,
          action: "assigned",
          details: { assignedTo: task.assignedTo },
        });
        
        // Create notification and send email for new assignee
        if (task.assignedTo) {
          const assigneeInfo = await findAssignee(task.assignedTo);
          
          if (assigneeInfo) {
            // Create in-app notification only if we have a user account
            if (assigneeInfo.user && assigneeInfo.user.id !== userId) {
              await storage.createNotification({
                userId: assigneeInfo.user.id,
                type: "assignment",
                title: "New task assigned",
                message: task.description?.substring(0, 100),
                taskId: id,
              });
            }
            
            // Send email notification (works with user or directory member email)
            const targetEmail = assigneeInfo.user?.email || assigneeInfo.email;
            if (targetEmail && assigneeInfo.user?.id !== userId) {
              const assignerName = (req as any).user?.firstName || updates.assignedBy || "Someone";
              await emailService.sendTaskAssignmentEmail(
                task,
                { email: targetEmail, name: assigneeInfo.name },
                assignerName
              );
            }
          }
        }
      }
      
      if (existingTask.dueDate !== task.dueDate) {
        await storage.createActivityLog({
          taskId: id,
          userId,
          action: "due_date_changed",
          details: { from: existingTask.dueDate, to: task.dueDate },
        });
      }
      
      // Log general update if no specific field tracked
      const trackedFields = ['status', 'priority', 'assignedTo', 'dueDate'];
      const hasOtherChanges = Object.keys(updates).some(key => !trackedFields.includes(key));
      if (hasOtherChanges && Object.keys(updates).length > 0) {
        await storage.createActivityLog({
          taskId: id,
          userId,
          action: "updated",
          details: { fields: Object.keys(updates).filter(k => !trackedFields.includes(k)) },
        });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating content task:", error);
      res.status(500).json({ error: "Failed to update content task" });
    }
  });

  // Delete content task
  app.delete("/api/content-tasks/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteContentTask(id);
      if (!deleted) {
        return res.status(404).json({ error: "Content task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting content task:", error);
      res.status(500).json({ error: "Failed to delete content task" });
    }
  });

  // ================== DIRECTORY MEMBER ENDPOINTS ==================
  // These require "content" or "admin" role

  // Get all directory members
  app.get("/api/directory", requireRole("content"), async (req, res) => {
    try {
      const members = await storage.getDirectoryMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching directory:", error);
      res.status(500).json({ error: "Failed to fetch directory" });
    }
  });

  // Get single directory member
  app.get("/api/directory/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const member = await storage.getDirectoryMember(id);
      if (!member) {
        return res.status(404).json({ error: "Directory member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error fetching directory member:", error);
      res.status(500).json({ error: "Failed to fetch directory member" });
    }
  });

  // Create directory member
  app.post("/api/directory", requireRole("content"), async (req, res) => {
    try {
      const { person, skill, evmAddress, client, email } = req.body;
      
      if (!person || typeof person !== "string") {
        return res.status(400).json({ error: "Person name is required" });
      }
      
      const member = await storage.createDirectoryMember({
        person,
        skill: skill || undefined,
        evmAddress: evmAddress || undefined,
        client: client || undefined,
        email: email || undefined,
      });
      
      res.status(201).json(member);
    } catch (error) {
      console.error("Error creating directory member:", error);
      res.status(500).json({ error: "Failed to create directory member" });
    }
  });

  // Update directory member
  app.put("/api/directory/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const member = await storage.updateDirectoryMember(id, updates);
      if (!member) {
        return res.status(404).json({ error: "Directory member not found" });
      }
      
      res.json(member);
    } catch (error) {
      console.error("Error updating directory member:", error);
      res.status(500).json({ error: "Failed to update directory member" });
    }
  });

  // Delete directory member
  app.delete("/api/directory/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDirectoryMember(id);
      if (!deleted) {
        return res.status(404).json({ error: "Directory member not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting directory member:", error);
      res.status(500).json({ error: "Failed to delete directory member" });
    }
  });

  // ================== DELIVERABLE ENDPOINTS ==================
  // These require "content" or "admin" role

  // Get all deliverables
  app.get("/api/deliverables", requireRole("content"), async (req, res) => {
    try {
      const deliverables = await storage.getDeliverables();
      res.json(deliverables);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      res.status(500).json({ error: "Failed to fetch deliverables" });
    }
  });

  // Get deliverables by task ID
  app.get("/api/content-tasks/:id/deliverables", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const deliverables = await storage.getDeliverablesByTaskId(taskId);
      res.json(deliverables);
    } catch (error) {
      console.error("Error fetching task deliverables:", error);
      res.status(500).json({ error: "Failed to fetch task deliverables" });
    }
  });

  // Upload deliverable for a task
  app.post(
    "/api/content-tasks/:id/deliverables",
    requireRole("content"),
    upload.single("file"),
    async (req, res) => {
      try {
        const taskId = parseInt(req.params.id);
        const file = req.file;
        
        if (!file) {
          return res.status(400).json({ error: "File is required" });
        }
        
        const task = await storage.getContentTask(taskId);
        if (!task) {
          return res.status(404).json({ error: "Content task not found" });
        }
        
        let filePath: string = "";
        let driveLink: string | null = null;
        
        // Limit file size to 50MB for memory safety
        const maxFileSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxFileSize) {
          return res.status(400).json({ 
            error: `File too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB` 
          });
        }
        
        // Try to upload to Google Drive if credentials are configured
        const hasGoogleCredentials = !!(
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && 
          process.env.GOOGLE_PRIVATE_KEY &&
          process.env.GOOGLE_SHEET_ID
        );
        
        if (hasGoogleCredentials) {
          try {
            // Ensure Drive is initialized
            if (!googleSheetsService.isDriveConfigured()) {
              await googleSheetsService.initialize();
            }
            
            if (googleSheetsService.isDriveConfigured()) {
              driveLink = await googleSheetsService.uploadToDrive(
                file.buffer,
                file.originalname,
                file.mimetype
              );
              filePath = driveLink;
              console.log(`Uploaded to Google Drive: ${driveLink}`);
            }
          } catch (driveError) {
            console.error("Google Drive upload failed, falling back to local:", driveError);
            // Fall back to local storage
            driveLink = null;
          }
        }
        
        // If Drive upload failed or not configured, save locally
        if (!filePath) {
          const fs = await import("fs");
          const path = await import("path");
          const uploadsDir = path.join(process.cwd(), "uploads");
          
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          const uniqueName = `${Date.now()}-${file.originalname}`;
          const localPath = path.join(uploadsDir, uniqueName);
          fs.writeFileSync(localPath, file.buffer);
          filePath = `/uploads/${uniqueName}`;
        }
        
        const deliverable = await storage.createDeliverable({
          taskId,
          fileName: file.originalname,
          filePath,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        });
        
        // Update task's deliverable field with the link
        if (driveLink) {
          await storage.updateContentTask(taskId, {
            deliverable: driveLink,
          });
        }
        
        res.status(201).json(deliverable);
      } catch (error) {
        console.error("Error uploading deliverable:", error);
        res.status(500).json({ error: "Failed to upload deliverable" });
      }
    }
  );

  // Delete deliverable
  app.delete("/api/deliverables/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deliverable = await storage.getDeliverable(id);
      
      if (!deliverable) {
        return res.status(404).json({ error: "Deliverable not found" });
      }
      
      // Only delete local files (not Drive URLs)
      const isLocalFile = deliverable.filePath.startsWith("/uploads/");
      if (isLocalFile) {
        const fs = await import("fs");
        const path = await import("path");
        const filePath = path.join(process.cwd(), deliverable.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      // Note: Drive files are not deleted - they remain accessible via the link
      // This is intentional as the link may be referenced in Google Sheets
      
      await storage.deleteDeliverable(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting deliverable:", error);
      res.status(500).json({ error: "Failed to delete deliverable" });
    }
  });

  // ================== GOOGLE SHEETS SYNC ENDPOINTS ==================
  // These require "content" or "admin" role

  // Get Google Sheets sync status - auto-connect if not yet connected
  app.get("/api/sheets/status", requireRole("content"), async (req, res) => {
    try {
      const hasCredentials = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
      const hasSheetId = !!process.env.GOOGLE_SHEET_ID;
      
      // Auto-connect if credentials and sheet ID are configured but not yet connected
      if (!googleSheetsService.isConfigured() && hasCredentials && hasSheetId) {
        try {
          await googleSheetsService.initialize();
          console.log("Auto-connected to Google Sheets on status check");
        } catch (initError) {
          console.error("Auto-connect failed:", initError);
        }
      }
      
      const isConfigured = googleSheetsService.isConfigured();
      res.json({ 
        configured: isConfigured,
        sheetId: process.env.GOOGLE_SHEET_ID || null,
        hasCredentials,
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null,
      });
    } catch (error) {
      console.error("Error checking sheets status:", error);
      res.status(500).json({ error: "Failed to check sheets status" });
    }
  });

  // Initialize Google Sheets connection
  app.post("/api/sheets/connect", requireRole("content"), async (req, res) => {
    try {
      const { sheetId } = req.body;
      
      // If sheetId is provided, temporarily set it in the environment
      if (sheetId) {
        process.env.GOOGLE_SHEET_ID = sheetId;
      }
      
      const success = await googleSheetsService.initialize();
      if (success) {
        await googleSheetsService.ensureHeaderRow();
        res.json({ success: true, message: "Connected to Google Sheets" });
      } else {
        // Clear the sheet ID if connection failed
        if (sheetId) {
          delete process.env.GOOGLE_SHEET_ID;
        }
        
        const hasCredentials = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
        if (!hasCredentials) {
          res.status(400).json({ 
            success: false, 
            error: "Missing credentials - please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY" 
          });
        } else if (!sheetId && !process.env.GOOGLE_SHEET_ID) {
          res.status(400).json({ 
            success: false, 
            error: "Please provide a Google Sheet ID or URL" 
          });
        } else {
          res.status(400).json({ 
            success: false, 
            error: "Failed to connect - check that the sheet is shared with the service account" 
          });
        }
      }
    } catch (error) {
      console.error("Error connecting to sheets:", error);
      res.status(500).json({ error: "Failed to connect to Google Sheets" });
    }
  });
  
  // Disconnect from Google Sheets
  app.post("/api/sheets/disconnect", requireRole("content"), async (req, res) => {
    try {
      delete process.env.GOOGLE_SHEET_ID;
      res.json({ success: true, message: "Disconnected from Google Sheets" });
    } catch (error) {
      console.error("Error disconnecting from sheets:", error);
      res.status(500).json({ error: "Failed to disconnect from Google Sheets" });
    }
  });

  // Sync tasks TO Google Sheet (push database to sheet)
  app.post("/api/sheets/sync/push", requireRole("content"), async (req, res) => {
    try {
      if (!googleSheetsService.isConfigured()) {
        return res.status(400).json({ error: "Google Sheets not configured" });
      }
      
      const tasks = await storage.getContentTasks();
      await googleSheetsService.syncToSheet(tasks);
      
      res.json({ 
        success: true, 
        message: `Pushed ${tasks.length} tasks to Google Sheet` 
      });
    } catch (error) {
      console.error("Error pushing to sheet:", error);
      res.status(500).json({ error: "Failed to push tasks to Google Sheet" });
    }
  });

  // Sync tasks FROM Google Sheet (pull sheet to database)
  app.post("/api/sheets/sync/pull", requireRole("content"), async (req, res) => {
    try {
      if (!googleSheetsService.isConfigured()) {
        return res.status(400).json({ error: "Google Sheets not configured" });
      }
      
      const sheetRows = await googleSheetsService.getSheetData();
      let created = 0;
      let updated = 0;
      
      // Get existing tasks to compare
      const existingTasks = await storage.getContentTasks();
      const existingDescriptions = new Set(existingTasks.map(t => t.description.toLowerCase().trim()));
      
      for (const row of sheetRows) {
        if (!row.description || row.description.trim() === "") {
          continue;
        }
        
        const descLower = row.description.toLowerCase().trim();
        
        // Check if task exists (by description match)
        const existingTask = existingTasks.find(
          t => t.description.toLowerCase().trim() === descLower
        );
        
        if (existingTask) {
          // Update existing task if data changed
          await storage.updateContentTask(existingTask.id, {
            status: row.status || existingTask.status,
            assignedTo: row.assignedTo || existingTask.assignedTo || undefined,
            dueDate: row.dueDate || existingTask.dueDate || undefined,
            assignedBy: row.assignedBy || existingTask.assignedBy || undefined,
            client: row.client || existingTask.client || undefined,
            deliverable: row.deliverable || existingTask.deliverable || undefined,
            notes: row.notes || existingTask.notes || undefined,
          });
          updated++;
        } else {
          // Create new task
          await storage.createContentTask({
            description: row.description,
            status: row.status || "TO BE STARTED",
            assignedTo: row.assignedTo,
            dueDate: row.dueDate,
            assignedBy: row.assignedBy,
            client: row.client,
            deliverable: row.deliverable,
            notes: row.notes,
            priority: "medium",
          });
          created++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `Pulled from sheet: ${created} created, ${updated} updated` 
      });
    } catch (error) {
      console.error("Error pulling from sheet:", error);
      res.status(500).json({ error: "Failed to pull tasks from Google Sheet" });
    }
  });

  // Sync directory TO Google Sheet (push database to sheet)
  app.post("/api/sheets/sync/directory/push", requireRole("content"), async (req, res) => {
    try {
      if (!googleSheetsService.isConfigured()) {
        return res.status(400).json({ error: "Google Sheets not configured" });
      }
      
      const members = await storage.getDirectoryMembers();
      await googleSheetsService.syncDirectoryToSheet(members);
      
      res.json({ 
        success: true, 
        message: `Pushed ${members.length} directory members to Google Sheet` 
      });
    } catch (error) {
      console.error("Error pushing directory to sheet:", error);
      res.status(500).json({ error: "Failed to push directory to Google Sheet" });
    }
  });

  // Sync directory FROM Google Sheet (pull sheet to database)
  app.post("/api/sheets/sync/directory/pull", requireRole("content"), async (req, res) => {
    try {
      if (!googleSheetsService.isConfigured()) {
        return res.status(400).json({ error: "Google Sheets not configured" });
      }
      
      const sheetRows = await googleSheetsService.getDirectoryData();
      let created = 0;
      let updated = 0;
      
      // Get existing members to compare
      const existingMembers = await storage.getDirectoryMembers();
      
      for (const row of sheetRows) {
        if (!row.person || row.person.trim() === "") {
          continue;
        }
        
        const personLower = row.person.toLowerCase().trim();
        
        // Check if member exists (by person name match)
        const existingMember = existingMembers.find(
          m => m.person.toLowerCase().trim() === personLower
        );
        
        if (existingMember) {
          // Update existing member if data changed
          await storage.updateDirectoryMember(existingMember.id, {
            skill: row.skill || existingMember.skill || undefined,
            evmAddress: row.evmAddress || existingMember.evmAddress || undefined,
            client: row.client || existingMember.client || undefined,
          });
          updated++;
        } else {
          // Create new member
          await storage.createDirectoryMember({
            person: row.person,
            skill: row.skill,
            evmAddress: row.evmAddress,
            client: row.client,
          });
          created++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `Pulled from sheet: ${created} created, ${updated} updated` 
      });
    } catch (error) {
      console.error("Error pulling directory from sheet:", error);
      res.status(500).json({ error: "Failed to pull directory from Google Sheet" });
    }
  });

  // ================== CAMPAIGN ENDPOINTS ==================
  // These require "content" or "admin" role

  // Get all campaigns
  app.get("/api/campaigns", requireRole("content"), async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Get single campaign
  app.get("/api/campaigns/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });

  // Create campaign
  app.post("/api/campaigns", requireRole("content"), async (req: any, res) => {
    try {
      const campaign = await storage.createCampaign(req.body);
      
      // Log activity
      await storage.createActivityLog({
        campaignId: campaign.id,
        userId: (req as any).user?.id || null,
        action: "campaign_created",
        details: { name: campaign.name },
      });
      
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  // Update campaign
  app.put("/api/campaigns/:id", requireRole("content"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.updateCampaign(id, req.body);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        campaignId: id,
        userId: (req as any).user?.id || null,
        action: "campaign_updated",
        details: { updates: req.body },
      });
      
      res.json(campaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  // Delete campaign
  app.delete("/api/campaigns/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCampaign(id);
      if (!success) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  // Get tasks for a campaign
  app.get("/api/campaigns/:id/tasks", requireRole("content"), async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const allTasks = await storage.getContentTasks();
      const campaignTasks = allTasks.filter(t => t.campaignId === campaignId);
      res.json(campaignTasks);
    } catch (error) {
      console.error("Error fetching campaign tasks:", error);
      res.status(500).json({ error: "Failed to fetch campaign tasks" });
    }
  });

  // ================== SUBTASK ENDPOINTS ==================

  // Get subtasks for a task
  app.get("/api/content-tasks/:id/subtasks", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const subtasks = await storage.getSubtasks(taskId);
      res.json(subtasks);
    } catch (error) {
      console.error("Error fetching subtasks:", error);
      res.status(500).json({ error: "Failed to fetch subtasks" });
    }
  });

  // Create subtask
  app.post("/api/content-tasks/:id/subtasks", requireRole("content"), async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { title, order } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }
      
      const subtask = await storage.createSubtask({
        taskId,
        title,
        completed: false,
        order: order || 0,
      });
      
      // Log activity
      await storage.createActivityLog({
        taskId,
        userId: (req as any).user?.id || null,
        action: "subtask_added",
        details: { title },
      });
      
      res.status(201).json(subtask);
    } catch (error) {
      console.error("Error creating subtask:", error);
      res.status(500).json({ error: "Failed to create subtask" });
    }
  });

  // Update subtask
  app.patch("/api/subtasks/:id", requireRole("content"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const subtask = await storage.updateSubtask(id, req.body);
      if (!subtask) {
        return res.status(404).json({ error: "Subtask not found" });
      }
      
      // Log activity if completion status changed
      if (req.body.completed !== undefined) {
        await storage.createActivityLog({
          taskId: subtask.taskId,
          userId: (req as any).user?.id || null,
          action: req.body.completed ? "subtask_completed" : "subtask_uncompleted",
          details: { title: subtask.title },
        });
      }
      
      res.json(subtask);
    } catch (error) {
      console.error("Error updating subtask:", error);
      res.status(500).json({ error: "Failed to update subtask" });
    }
  });

  // Delete subtask
  app.delete("/api/subtasks/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSubtask(id);
      if (!success) {
        return res.status(404).json({ error: "Subtask not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting subtask:", error);
      res.status(500).json({ error: "Failed to delete subtask" });
    }
  });

  // ================== COMMENT ENDPOINTS ==================

  // Get comments for a task
  app.get("/api/content-tasks/:id/comments", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const comments = await storage.getComments(taskId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Create comment
  app.post("/api/content-tasks/:id/comments", requireRole("content"), async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { content, parentId } = req.body;
      const userId = (req as any).user?.id;
      
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }
      
      if (!userId) {
        return res.status(401).json({ error: "User ID required" });
      }
      
      const comment = await storage.createComment({
        taskId,
        userId,
        content,
        parentId: parentId || null,
      });
      
      // Log activity
      await storage.createActivityLog({
        taskId,
        userId,
        action: "comment_added",
        details: { preview: content.substring(0, 100) },
      });
      
      // Create notification for task assignee if different from commenter
      const task = await storage.getContentTask(taskId);
      if (task?.assignedTo) {
        // Find user by name in directory (simplified - in production would need proper user lookup)
        const allUsers = await storage.getAllUsers();
        const assignee = allUsers.find(u => 
          `${u.firstName} ${u.lastName}`.toLowerCase() === task.assignedTo?.toLowerCase() ||
          u.email === task.assignedTo
        );
        
        if (assignee && assignee.id !== userId) {
          await storage.createNotification({
            userId: assignee.id,
            type: "comment",
            title: "New comment on your task",
            message: content.substring(0, 100),
            taskId,
          });
        }
      }
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Update comment
  app.patch("/api/comments/:id", requireRole("content"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }
      
      const comment = await storage.updateComment(id, content);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      
      res.json(comment);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  // Delete comment
  app.delete("/api/comments/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteComment(id);
      if (!success) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // ================== ACTIVITY LOG ENDPOINTS ==================

  // Get activity log for a task
  app.get("/api/content-tasks/:id/activity", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const activity = await storage.getActivityLog(taskId, undefined, limit);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching activity log:", error);
      res.status(500).json({ error: "Failed to fetch activity log" });
    }
  });

  // Get activity log for a campaign
  app.get("/api/campaigns/:id/activity", requireRole("content"), async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const activity = await storage.getActivityLog(undefined, campaignId, limit);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching campaign activity log:", error);
      res.status(500).json({ error: "Failed to fetch campaign activity log" });
    }
  });

  // ================== NOTIFICATION ENDPOINTS ==================

  // Get notifications for current user
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      const success = await storage.markNotificationRead(id, userId);
      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ error: "Failed to mark notification read" });
    }
  });

  // Mark all notifications as read
  app.patch("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ error: "Failed to mark all notifications read" });
    }
  });

  // ================== ANALYTICS ENDPOINTS ==================

  // Get task analytics/metrics
  app.get("/api/analytics/tasks", requireRole("content"), async (req, res) => {
    try {
      const tasks = await storage.getContentTasks();
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Calculate metrics
      const totalTasks = tasks.length;
      const byStatus: Record<string, number> = {};
      const byClient: Record<string, number> = {};
      const byAssignee: Record<string, number> = {};
      let overdueTasks = 0;
      let completedThisWeek = 0;
      
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      for (const task of tasks) {
        // Status breakdown
        byStatus[task.status] = (byStatus[task.status] || 0) + 1;
        
        // Client breakdown
        if (task.client) {
          byClient[task.client] = (byClient[task.client] || 0) + 1;
        }
        
        // Assignee breakdown
        if (task.assignedTo) {
          byAssignee[task.assignedTo] = (byAssignee[task.assignedTo] || 0) + 1;
        }
        
        // Overdue tasks
        if (task.dueDate && task.status !== "COMPLETED") {
          const dueDate = new Date(task.dueDate);
          if (dueDate < today) {
            overdueTasks++;
          }
        }
        
        // Completed this week
        if (task.status === "COMPLETED" && task.createdAt) {
          const createdAt = new Date(task.createdAt);
          if (createdAt >= oneWeekAgo) {
            completedThisWeek++;
          }
        }
      }
      
      res.json({
        totalTasks,
        byStatus,
        byClient,
        byAssignee,
        overdueTasks,
        completedThisWeek,
        completionRate: totalTasks > 0 
          ? Math.round(((byStatus["COMPLETED"] || 0) / totalTasks) * 100) 
          : 0,
      });
    } catch (error) {
      console.error("Error fetching task analytics:", error);
      res.status(500).json({ error: "Failed to fetch task analytics" });
    }
  });

  // ================== TASK TEMPLATE ENDPOINTS ==================

  // Get all task templates
  app.get("/api/task-templates", requireRole("content"), async (req, res) => {
    try {
      const templates = await storage.getTaskTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching task templates:", error);
      res.status(500).json({ error: "Failed to fetch task templates" });
    }
  });

  // Get a single task template with subtasks
  app.get("/api/task-templates/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getTaskTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      const subtasks = await storage.getTemplateSubtasks(id);
      res.json({ ...template, subtasks });
    } catch (error) {
      console.error("Error fetching task template:", error);
      res.status(500).json({ error: "Failed to fetch task template" });
    }
  });

  // Create a new task template
  app.post("/api/task-templates", requireRole("content"), async (req, res) => {
    try {
      const { subtasks, ...templateData } = req.body;
      const template = await storage.createTaskTemplate({
        ...templateData,
        createdBy: (req as any).user?.id,
      });
      
      // Create subtasks if provided
      if (subtasks && Array.isArray(subtasks)) {
        for (let i = 0; i < subtasks.length; i++) {
          await storage.createTemplateSubtask({
            templateId: template.id,
            title: subtasks[i].title || subtasks[i],
            order: i,
          });
        }
      }
      
      const createdSubtasks = await storage.getTemplateSubtasks(template.id);
      res.status(201).json({ ...template, subtasks: createdSubtasks });
    } catch (error) {
      console.error("Error creating task template:", error);
      res.status(500).json({ error: "Failed to create task template" });
    }
  });

  // Update a task template
  app.put("/api/task-templates/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { subtasks, ...templateData } = req.body;
      
      const updated = await storage.updateTaskTemplate(id, templateData);
      if (!updated) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      // Update subtasks if provided - delete existing and recreate
      if (subtasks && Array.isArray(subtasks)) {
        const existingSubtasks = await storage.getTemplateSubtasks(id);
        for (const sub of existingSubtasks) {
          await storage.deleteTemplateSubtask(sub.id);
        }
        for (let i = 0; i < subtasks.length; i++) {
          await storage.createTemplateSubtask({
            templateId: id,
            title: subtasks[i].title || subtasks[i],
            order: i,
          });
        }
      }
      
      const updatedSubtasks = await storage.getTemplateSubtasks(id);
      res.json({ ...updated, subtasks: updatedSubtasks });
    } catch (error) {
      console.error("Error updating task template:", error);
      res.status(500).json({ error: "Failed to update task template" });
    }
  });

  // Delete a task template
  app.delete("/api/task-templates/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTaskTemplate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task template:", error);
      res.status(500).json({ error: "Failed to delete task template" });
    }
  });

  // Create task from template
  app.post("/api/task-templates/:id/create-task", requireRole("content"), async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const { overrides } = req.body; // Allow overriding template defaults
      
      const template = await storage.getTaskTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      // Create the task from template
      const task = await storage.createContentTask({
        description: overrides?.description || template.description || template.name,
        status: "TO BE STARTED",
        priority: overrides?.priority || template.defaultPriority || "medium",
        client: overrides?.client || template.defaultClient,
        assignedTo: overrides?.assignedTo,
        dueDate: overrides?.dueDate,
      });
      
      // Create subtasks from template
      const templateSubtasks = await storage.getTemplateSubtasks(templateId);
      for (const sub of templateSubtasks) {
        await storage.createSubtask({
          taskId: task.id,
          title: sub.title,
          completed: false,
        });
      }
      
      // Log activity
      await storage.createActivityLog({
        taskId: task.id,
        userId: (req as any).user?.id || null,
        action: "created_from_template",
        details: `Created from template: ${template.name}`,
      });
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task from template:", error);
      res.status(500).json({ error: "Failed to create task from template" });
    }
  });

  // ================== TASK WATCHER ENDPOINTS ==================

  // Get watchers for a task
  app.get("/api/content-tasks/:id/watchers", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const watchers = await storage.getTaskWatchers(taskId);
      res.json(watchers);
    } catch (error) {
      console.error("Error fetching task watchers:", error);
      res.status(500).json({ error: "Failed to fetch task watchers" });
    }
  });

  // Check if current user is watching a task
  app.get("/api/content-tasks/:id/watching", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const isWatching = await storage.isWatchingTask(taskId, userId);
      res.json({ isWatching });
    } catch (error) {
      console.error("Error checking watch status:", error);
      res.status(500).json({ error: "Failed to check watch status" });
    }
  });

  // Watch a task (can add any user as watcher if userId is provided)
  app.post("/api/content-tasks/:id/watch", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const currentUserId = (req as any).user?.id;
      const targetUserId = req.body.userId || currentUserId;
      
      if (!targetUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const isAlreadyWatching = await storage.isWatchingTask(taskId, targetUserId);
      if (isAlreadyWatching) {
        return res.json({ success: true, message: "Already watching" });
      }
      
      await storage.watchTask(taskId, targetUserId);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error watching task:", error);
      res.status(500).json({ error: "Failed to watch task" });
    }
  });

  // Unwatch a task (can remove any user if userId is provided, but only current user can remove themselves)
  app.delete("/api/content-tasks/:id/watch", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const currentUserId = (req as any).user?.id;
      const targetUserId = req.body.userId || currentUserId;
      
      if (!targetUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Users can only remove themselves as watchers
      if (targetUserId !== currentUserId) {
        return res.status(403).json({ error: "Can only remove yourself as a watcher" });
      }
      
      await storage.unwatchTask(taskId, targetUserId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unwatching task:", error);
      res.status(500).json({ error: "Failed to unwatch task" });
    }
  });

  // ================== USER LIST ENDPOINT ==================

  // Get all users (for watchers/approvals selection and DAO membership)
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      // Allow content users and admins to access user list
      if (req.user.role !== "content" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }
      const users = await storage.getAllUsers();
      // Return safe user data (no passwords)
      const safeUsers = users.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        displayName: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email,
        profileImageUrl: u.profileImageUrl,
        role: u.role,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // ================== APPROVAL ENDPOINTS ==================

  // Get approvals for a task with joined user data and stage progression
  app.get("/api/content-tasks/:id/approvals", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const taskApprovals = await storage.getApprovals(taskId);
      
      // Enrich approvals with user data
      const allUsers = await storage.getAllUsers();
      const userMap = new Map(allUsers.map(u => [u.id, {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        profileImageUrl: u.profileImageUrl,
      }]));
      
      // Calculate stage progression
      const sortedApprovals = [...taskApprovals].sort((a, b) => (a.stage || 1) - (b.stage || 1));
      const stages = [...new Set(sortedApprovals.map(a => a.stage || 1))].sort((a, b) => a - b);
      
      // Find active stage (first stage that isn't fully approved)
      let activeStage = 1;
      for (const stage of stages) {
        const stageApprovals = sortedApprovals.filter(a => (a.stage || 1) === stage);
        const requiredApprovals = stageApprovals.filter(a => a.isRequired);
        const allRequiredApproved = requiredApprovals.every(a => a.status === "approved");
        
        if (!allRequiredApproved) {
          activeStage = stage;
          break;
        }
        // Move to next stage if current is complete
        if (stage === stages[stages.length - 1]) {
          activeStage = stage; // All stages complete
        }
      }
      
      const enrichedApprovals = sortedApprovals.map(approval => ({
        ...approval,
        approver: userMap.get(approval.reviewerId) || null, // Keep for backward compatibility
        reviewer: userMap.get(approval.reviewerId) || null, // New canonical name
        isActiveStage: (approval.stage || 1) === activeStage,
      }));
      
      // Calculate overall progress
      const totalApprovals = enrichedApprovals.length;
      const approvedCount = enrichedApprovals.filter(a => a.status === "approved").length;
      const progressPercent = totalApprovals > 0 ? Math.round((approvedCount / totalApprovals) * 100) : 0;
      
      res.json({
        approvals: enrichedApprovals,
        progression: {
          activeStage,
          totalStages: stages.length,
          completedStages: stages.filter(stage => {
            const stageApprovals = sortedApprovals.filter(a => (a.stage || 1) === stage);
            return stageApprovals.every(a => a.status === "approved");
          }).length,
          progressPercent,
          isComplete: enrichedApprovals.every(a => a.status === "approved"),
        }
      });
    } catch (error) {
      console.error("Error fetching approvals:", error);
      res.status(500).json({ error: "Failed to fetch approvals" });
    }
  });

  // Request approval for a task
  app.post("/api/content-tasks/:id/approvals", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { reviewerId } = req.body;
      
      if (!reviewerId) {
        return res.status(400).json({ error: "Reviewer ID is required" });
      }
      
      const approval = await storage.createApproval({
        taskId,
        reviewerId,
        status: "pending",
      });
      
      // Create notification for reviewer
      await storage.createNotification({
        userId: reviewerId,
        type: "approval_request",
        title: "Approval Request",
        message: `You have been requested to review a task`,
        taskId,
      });
      
      // Log activity
      await storage.createActivityLog({
        taskId,
        userId: (req as any).user?.id || null,
        action: "approval_requested",
        details: `Requested approval from reviewer`,
      });
      
      res.status(201).json(approval);
    } catch (error) {
      console.error("Error requesting approval:", error);
      res.status(500).json({ error: "Failed to request approval" });
    }
  });

  // Update approval status (approve/reject)
  app.patch("/api/approvals/:id", requireRole("content"), async (req, res) => {
    try {
      const approvalId = parseInt(req.params.id);
      const { status, comments } = req.body;
      
      if (!status || !["approved", "rejected", "revision_requested", "skipped"].includes(status)) {
        return res.status(400).json({ error: "Valid status required" });
      }
      
      const updated = await storage.updateApprovalStatus(approvalId, status, comments);
      if (!updated) {
        return res.status(404).json({ error: "Approval not found" });
      }
      
      // Log activity
      if (updated.taskId) {
        await storage.createActivityLog({
          taskId: updated.taskId,
          userId: (req as any).user?.id || null,
          action: `approval_${status}`,
          details: comments || `Task ${status}`,
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating approval:", error);
      res.status(500).json({ error: "Failed to update approval" });
    }
  });

  // Get pending approvals for current user
  app.get("/api/approvals/pending", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const approvals = await storage.getPendingApprovals(userId);
      res.json(approvals);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      res.status(500).json({ error: "Failed to fetch pending approvals" });
    }
  });

  // ================== APPROVAL WORKFLOW ENDPOINTS ==================

  // Get all approval workflows
  app.get("/api/approval-workflows", requireRole("content"), async (req, res) => {
    try {
      const workflows = await storage.getApprovalWorkflows();
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching approval workflows:", error);
      res.status(500).json({ error: "Failed to fetch approval workflows" });
    }
  });

  // Get approval workflow by ID with stages
  app.get("/api/approval-workflows/:id", requireRole("content"), async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id);
      const workflow = await storage.getApprovalWorkflow(workflowId);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      const stages = await storage.getApprovalWorkflowStages(workflowId);
      res.json({ ...workflow, stages });
    } catch (error) {
      console.error("Error fetching approval workflow:", error);
      res.status(500).json({ error: "Failed to fetch approval workflow" });
    }
  });

  // Create approval workflow (admin only)
  app.post("/api/approval-workflows", requireRole("admin"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const { name, description, contentType, stages } = req.body;
      
      const workflow = await storage.createApprovalWorkflow({
        name,
        description,
        contentType,
        createdBy: userId,
      });

      // Create stages
      if (stages && Array.isArray(stages)) {
        for (const stage of stages) {
          await storage.createApprovalWorkflowStage({
            workflowId: workflow.id,
            stageName: stage.stageName,
            stageOrder: stage.stageOrder,
            reviewerRole: stage.reviewerRole,
            reviewerId: stage.reviewerId,
            isRequired: stage.isRequired ?? true,
            daysToComplete: stage.daysToComplete,
          });
        }
      }

      const createdStages = await storage.getApprovalWorkflowStages(workflow.id);
      res.status(201).json({ ...workflow, stages: createdStages });
    } catch (error) {
      console.error("Error creating approval workflow:", error);
      res.status(500).json({ error: "Failed to create approval workflow" });
    }
  });

  // Update approval workflow (admin only)
  app.patch("/api/approval-workflows/:id", requireRole("admin"), async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id);
      const { name, description, contentType, isActive } = req.body;
      
      const updated = await storage.updateApprovalWorkflow(workflowId, {
        name,
        description,
        contentType,
        isActive,
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating approval workflow:", error);
      res.status(500).json({ error: "Failed to update approval workflow" });
    }
  });

  // Delete approval workflow (admin only)
  app.delete("/api/approval-workflows/:id", requireRole("admin"), async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id);
      const deleted = await storage.deleteApprovalWorkflow(workflowId);
      if (!deleted) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting approval workflow:", error);
      res.status(500).json({ error: "Failed to delete approval workflow" });
    }
  });

  // Apply workflow to task
  app.post("/api/content-tasks/:id/apply-workflow", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { workflowId } = req.body;
      
      if (!workflowId) {
        return res.status(400).json({ error: "Workflow ID is required" });
      }
      
      const approvals = await storage.applyWorkflowToTask(taskId, workflowId);
      
      // Log activity
      await storage.createActivityLog({
        taskId,
        userId: (req as any).user?.id || null,
        action: "workflow_applied",
        details: `Applied approval workflow with ${approvals.length} stages`,
      });
      
      res.status(201).json(approvals);
    } catch (error) {
      console.error("Error applying workflow:", error);
      res.status(500).json({ error: "Failed to apply workflow" });
    }
  });

  // Get workflow stages
  app.get("/api/approval-workflows/:id/stages", requireRole("content"), async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id);
      const stages = await storage.getApprovalWorkflowStages(workflowId);
      res.json(stages);
    } catch (error) {
      console.error("Error fetching workflow stages:", error);
      res.status(500).json({ error: "Failed to fetch workflow stages" });
    }
  });

  // Add stage to workflow (admin only)
  app.post("/api/approval-workflows/:id/stages", requireRole("admin"), async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id);
      const { stageName, stageOrder, reviewerRole, reviewerId, isRequired, daysToComplete } = req.body;
      
      const stage = await storage.createApprovalWorkflowStage({
        workflowId,
        stageName,
        stageOrder: stageOrder || 1,
        reviewerRole,
        reviewerId,
        isRequired: isRequired ?? true,
        daysToComplete,
      });
      
      res.status(201).json(stage);
    } catch (error) {
      console.error("Error creating workflow stage:", error);
      res.status(500).json({ error: "Failed to create workflow stage" });
    }
  });

  // Update workflow stage (admin only)
  app.patch("/api/approval-workflows/:workflowId/stages/:id", requireRole("admin"), async (req, res) => {
    try {
      const stageId = parseInt(req.params.id);
      const { stageName, stageOrder, reviewerRole, reviewerId, isRequired, daysToComplete } = req.body;
      
      const updated = await storage.updateApprovalWorkflowStage(stageId, {
        stageName,
        stageOrder,
        reviewerRole,
        reviewerId,
        isRequired,
        daysToComplete,
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Stage not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating workflow stage:", error);
      res.status(500).json({ error: "Failed to update workflow stage" });
    }
  });

  // Delete workflow stage (admin only)
  app.delete("/api/approval-workflows/:workflowId/stages/:id", requireRole("admin"), async (req, res) => {
    try {
      const stageId = parseInt(req.params.id);
      const deleted = await storage.deleteApprovalWorkflowStage(stageId);
      if (!deleted) {
        return res.status(404).json({ error: "Stage not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting workflow stage:", error);
      res.status(500).json({ error: "Failed to delete workflow stage" });
    }
  });

  // ================== TIME ENTRY ENDPOINTS ==================

  // Get all time entries (for reports)
  app.get("/api/time-entries/all", requireRole("content"), async (req, res) => {
    try {
      const entries = await storage.getAllTimeEntries();
      res.json(entries);
    } catch (error) {
      console.error("Error fetching all time entries:", error);
      res.status(500).json({ error: "Failed to fetch time entries" });
    }
  });

  // Get time entries for a task
  app.get("/api/content-tasks/:id/time-entries", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const entries = await storage.getTimeEntries(taskId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ error: "Failed to fetch time entries" });
    }
  });

  // Get current user's time entries
  app.get("/api/time-entries/me", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { startDate, endDate } = req.query;
      const entries = await storage.getUserTimeEntries(
        userId,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(entries);
    } catch (error) {
      console.error("Error fetching user time entries:", error);
      res.status(500).json({ error: "Failed to fetch time entries" });
    }
  });

  // Log time entry
  app.post("/api/content-tasks/:id/time-entries", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { hours, minutes, description, date } = req.body;
      
      const entry = await storage.createTimeEntry({
        taskId,
        userId,
        hours: parseInt(hours) || 0,
        minutes: parseInt(minutes) || 0,
        description,
        date: date || new Date().toISOString().split('T')[0],
      });
      
      // Log activity
      await storage.createActivityLog({
        taskId,
        userId,
        action: "time_logged",
        details: `Logged ${hours || 0}h ${minutes || 0}m`,
      });
      
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ error: "Failed to create time entry" });
    }
  });

  // Update time entry
  app.patch("/api/time-entries/:id", requireRole("content"), async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const updated = await storage.updateTimeEntry(entryId, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating time entry:", error);
      res.status(500).json({ error: "Failed to update time entry" });
    }
  });

  // Delete time entry
  app.delete("/api/time-entries/:id", requireRole("content"), async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const deleted = await storage.deleteTimeEntry(entryId);
      if (!deleted) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting time entry:", error);
      res.status(500).json({ error: "Failed to delete time entry" });
    }
  });

  // ================== ASSET LIBRARY ENDPOINTS ==================

  // Get all assets
  app.get("/api/assets", requireRole("content"), async (req, res) => {
    try {
      const { category } = req.query;
      const allAssets = await storage.getAssets(category as string | undefined);
      res.json(allAssets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  // Get single asset
  app.get("/api/assets/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error fetching asset:", error);
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  // Upload asset
  app.post("/api/assets", requireRole("content"), upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }
      
      const { name, category, tags, description } = req.body;
      const file = req.file;
      
      // Check file size limit (50MB)
      if (file.size > 50 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large. Maximum size is 50MB." });
      }
      
      // Determine file type from mimetype
      let fileType = "other";
      if (file.mimetype.startsWith("image/")) fileType = "image";
      else if (file.mimetype.startsWith("video/")) fileType = "video";
      else if (file.mimetype.startsWith("audio/")) fileType = "audio";
      else if (file.mimetype.includes("pdf")) fileType = "document";
      
      // Import and use Google Drive service
      const { uploadToGoogleDrive } = await import("./google-drive");
      const driveResult = await uploadToGoogleDrive(file.buffer, file.originalname, file.mimetype);
      
      const asset = await storage.createAsset({
        name: name || file.originalname,
        fileName: file.originalname,
        filePath: driveResult?.webViewLink || `/uploads/assets/${file.originalname}`,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        fileType,
        category: category || "general",
        tags,
        description,
        uploadedBy: (req as any).user?.id,
      });
      
      res.status(201).json(asset);
    } catch (error) {
      console.error("Error uploading asset:", error);
      res.status(500).json({ error: "Failed to upload asset" });
    }
  });

  // Update asset metadata
  app.patch("/api/assets/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateAsset(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating asset:", error);
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  // Delete asset
  app.delete("/api/assets/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAsset(id);
      if (!deleted) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // ================== DELIVERABLE VERSION ENDPOINTS ==================

  // Get versions for a deliverable
  app.get("/api/deliverables/:id/versions", requireRole("content"), async (req, res) => {
    try {
      const deliverableId = parseInt(req.params.id);
      const versions = await storage.getDeliverableVersions(deliverableId);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching deliverable versions:", error);
      res.status(500).json({ error: "Failed to fetch versions" });
    }
  });

  // Upload new version
  app.post("/api/deliverables/:id/versions", requireRole("content"), upload.single("file"), async (req, res) => {
    try {
      const deliverableId = parseInt(req.params.id);
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }
      
      // Get existing versions to determine new version number
      const existingVersions = await storage.getDeliverableVersions(deliverableId);
      const newVersionNumber = existingVersions.length > 0
        ? Math.max(...existingVersions.map(v => v.versionNumber)) + 1
        : 1;
      
      const file = req.file;
      const { notes } = req.body;
      
      // Upload to Google Drive
      const { uploadToGoogleDrive } = await import("./google-drive");
      const driveResult = await uploadToGoogleDrive(file.buffer, file.originalname, file.mimetype);
      
      const version = await storage.createDeliverableVersion({
        deliverableId,
        versionNumber: newVersionNumber,
        fileName: file.originalname,
        filePath: driveResult?.webViewLink || `/uploads/versions/${file.originalname}`,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        uploadedBy: (req as any).user?.id,
        notes,
      });
      
      res.status(201).json(version);
    } catch (error) {
      console.error("Error uploading deliverable version:", error);
      res.status(500).json({ error: "Failed to upload version" });
    }
  });

  // ================== SAVED FILTER ENDPOINTS ==================

  // Get user's saved filters
  app.get("/api/saved-filters", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const filters = await storage.getSavedFilters(userId);
      res.json(filters);
    } catch (error) {
      console.error("Error fetching saved filters:", error);
      res.status(500).json({ error: "Failed to fetch saved filters" });
    }
  });

  // Create saved filter
  app.post("/api/saved-filters", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { name, filters, isDefault } = req.body;
      const savedFilter = await storage.createSavedFilter({
        userId,
        name,
        filters,
        isDefault: isDefault || false,
      });
      res.status(201).json(savedFilter);
    } catch (error) {
      console.error("Error creating saved filter:", error);
      res.status(500).json({ error: "Failed to create saved filter" });
    }
  });

  // Update saved filter
  app.patch("/api/saved-filters/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateSavedFilter(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Saved filter not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating saved filter:", error);
      res.status(500).json({ error: "Failed to update saved filter" });
    }
  });

  // Delete saved filter
  app.delete("/api/saved-filters/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSavedFilter(id);
      if (!deleted) {
        return res.status(404).json({ error: "Saved filter not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting saved filter:", error);
      res.status(500).json({ error: "Failed to delete saved filter" });
    }
  });

  // ================== RECURRING TASK ENDPOINTS ==================

  // Get all recurring tasks
  app.get("/api/recurring-tasks", requireRole("content"), async (req, res) => {
    try {
      const tasks = await storage.getRecurringTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching recurring tasks:", error);
      res.status(500).json({ error: "Failed to fetch recurring tasks" });
    }
  });

  // Create recurring task
  app.post("/api/recurring-tasks", requireRole("content"), async (req, res) => {
    try {
      const task = await storage.createRecurringTask({
        ...req.body,
        createdBy: (req as any).user?.id,
      });
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating recurring task:", error);
      res.status(500).json({ error: "Failed to create recurring task" });
    }
  });

  // Update recurring task
  app.patch("/api/recurring-tasks/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateRecurringTask(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Recurring task not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating recurring task:", error);
      res.status(500).json({ error: "Failed to update recurring task" });
    }
  });

  // Delete recurring task
  app.delete("/api/recurring-tasks/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteRecurringTask(id);
      if (!deleted) {
        return res.status(404).json({ error: "Recurring task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting recurring task:", error);
      res.status(500).json({ error: "Failed to delete recurring task" });
    }
  });

  // ================== NOTIFICATION PREFERENCES ENDPOINTS ==================

  // Get user's notification preferences
  app.get("/api/notification-preferences", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const prefs = await storage.getNotificationPreferences(userId);
      res.json(prefs || {
        userId,
        emailAssignments: true,
        emailComments: true,
        emailDueSoon: true,
        emailOverdue: true,
        inAppAssignments: true,
        inAppComments: true,
        inAppMentions: true,
        inAppDueSoon: true,
      });
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ error: "Failed to fetch notification preferences" });
    }
  });

  // Update notification preferences
  app.put("/api/notification-preferences", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const prefs = await storage.upsertNotificationPreferences({
        userId,
        ...req.body,
      });
      res.json(prefs);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });

  // ================== TEAM INTEGRATION SETTINGS ENDPOINTS ==================

  // Get team integration settings (admin only)
  app.get("/api/integration-settings", requireRole("admin"), async (req, res) => {
    try {
      const settings = await storage.getTeamIntegrationSettings();
      if (!settings) {
        return res.json({
          telegramEnabled: false,
          discordEnabled: false,
          notifyOnTaskCreate: true,
          notifyOnTaskComplete: true,
          notifyOnTaskAssign: true,
          notifyOnComment: false,
          notifyOnDueSoon: true,
          notifyOnOverdue: true,
        });
      }
      res.json({
        ...settings,
        telegramBotToken: settings.telegramBotToken ? '***configured***' : null,
        discordWebhookUrl: settings.discordWebhookUrl ? '***configured***' : null,
      });
    } catch (error) {
      console.error("Error fetching integration settings:", error);
      res.status(500).json({ error: "Failed to fetch integration settings" });
    }
  });

  // Update team integration settings (admin only)
  app.put("/api/integration-settings", requireRole("admin"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const settings = await storage.upsertTeamIntegrationSettings({
        ...req.body,
        updatedBy: userId,
      });
      res.json({
        ...settings,
        telegramBotToken: settings.telegramBotToken ? '***configured***' : null,
        discordWebhookUrl: settings.discordWebhookUrl ? '***configured***' : null,
      });
    } catch (error) {
      console.error("Error updating integration settings:", error);
      res.status(500).json({ error: "Failed to update integration settings" });
    }
  });

  // Test Telegram connection
  app.post("/api/integration-settings/test-telegram", requireRole("admin"), async (req, res) => {
    try {
      const { botToken, chatId } = req.body;
      if (!botToken || !chatId) {
        return res.status(400).json({ error: "Bot token and chat ID are required" });
      }
      const result = await channelNotificationService.testTelegramConnection(botToken, chatId);
      res.json(result);
    } catch (error) {
      console.error("Error testing Telegram:", error);
      res.status(500).json({ error: "Failed to test Telegram connection" });
    }
  });

  // Test Discord webhook
  app.post("/api/integration-settings/test-discord", requireRole("admin"), async (req, res) => {
    try {
      const { webhookUrl } = req.body;
      if (!webhookUrl) {
        return res.status(400).json({ error: "Webhook URL is required" });
      }
      const result = await channelNotificationService.testDiscordWebhook(webhookUrl);
      res.json(result);
    } catch (error) {
      console.error("Error testing Discord:", error);
      res.status(500).json({ error: "Failed to test Discord webhook" });
    }
  });

  // ================== USER INVITE ENDPOINTS ==================

  // Get all user invites (admin only)
  app.get("/api/user-invites", requireRole("admin"), async (req, res) => {
    try {
      const invites = await storage.getUserInvites();
      res.json(invites);
    } catch (error) {
      console.error("Error fetching user invites:", error);
      res.status(500).json({ error: "Failed to fetch user invites" });
    }
  });

  // Create a user invite (admin only)
  app.post("/api/user-invites", requireRole("admin"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const { email, role } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "A user with this email already exists" });
      }

      // Check if there's already a pending invite
      const existingInvite = await storage.getUserInviteByEmail(email);
      if (existingInvite) {
        return res.status(400).json({ error: "An invite for this email already exists" });
      }

      // Generate token and expiration (7 days)
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invite = await storage.createUserInvite({
        email,
        role: role || 'content',
        token,
        invitedBy: userId,
        expiresAt,
      });

      // Send invite email if email service is configured
      if (emailService.isReady()) {
        const baseUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : process.env.REPLIT_DOMAINS 
            ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
            : 'http://localhost:5000';
        
        const inviteLink = `${baseUrl}/invite/${token}`;
        
        await emailService.sendEmail(email, "You're invited to ContentFlowStudio", `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3B82F6;">You've Been Invited!</h2>
            <p>You've been invited to join ContentFlowStudio as a ${role || 'content'} team member.</p>
            <p>Click the link below to create your account:</p>
            <p style="margin: 20px 0;">
              <a href="${inviteLink}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Accept Invitation
              </a>
            </p>
            <p style="color: #6B7280; font-size: 14px;">This invitation expires in 7 days.</p>
          </div>
        `);
      }

      res.json(invite);
    } catch (error) {
      console.error("Error creating user invite:", error);
      res.status(500).json({ error: "Failed to create user invite" });
    }
  });

  // Verify invite token (public endpoint)
  app.get("/api/user-invites/verify/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await storage.getUserInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: "Invalid or expired invite" });
      }

      res.json({ email: invite.email, role: invite.role });
    } catch (error) {
      console.error("Error verifying invite:", error);
      res.status(500).json({ error: "Failed to verify invite" });
    }
  });

  // Accept invite and create account (public endpoint)
  app.post("/api/user-invites/accept/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password, firstName, lastName } = req.body;

      const invite = await storage.getUserInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ error: "Invalid or expired invite" });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      if (!firstName) {
        return res.status(400).json({ error: "First name is required" });
      }

      // Hash password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        email: invite.email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      // Update user role
      await storage.updateUserRole(user.id, invite.role as any);

      // Mark invite as used
      await storage.markInviteUsed(invite.id);

      // Create onboarding record
      await storage.upsertUserOnboarding({
        userId: user.id,
        hasSeenWelcome: false,
      });

      res.json({ success: true, message: "Account created successfully" });
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  // Delete invite (admin only)
  app.delete("/api/user-invites/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUserInvite(id);
      if (!deleted) {
        return res.status(404).json({ error: "Invite not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invite:", error);
      res.status(500).json({ error: "Failed to delete invite" });
    }
  });

  // ================== USER ONBOARDING ENDPOINTS ==================

  // Get user onboarding status
  app.get("/api/onboarding", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const onboarding = await storage.getUserOnboarding(userId);
      res.json(onboarding || {
        userId,
        hasSeenWelcome: false,
        hasCreatedTask: false,
        hasAddedTeamMember: false,
        hasUploadedDeliverable: false,
      });
    } catch (error) {
      console.error("Error fetching onboarding:", error);
      res.status(500).json({ error: "Failed to fetch onboarding status" });
    }
  });

  // Update onboarding step
  app.post("/api/onboarding/:step", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const { step } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const onboarding = await storage.updateOnboardingStep(userId, step);
      res.json(onboarding);
    } catch (error) {
      console.error("Error updating onboarding:", error);
      res.status(500).json({ error: "Failed to update onboarding" });
    }
  });

  // ================== TASK EXPORT ENDPOINTS ==================

  // Export all tasks as JSON
  app.get("/api/content-tasks/export/json", requireRole("content"), async (req, res) => {
    try {
      const tasks = await storage.getContentTasks();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=tasks-export.json');
      res.json(tasks);
    } catch (error) {
      console.error("Error exporting tasks:", error);
      res.status(500).json({ error: "Failed to export tasks" });
    }
  });

  // Export all tasks as CSV
  app.get("/api/content-tasks/export/csv", requireRole("content"), async (req, res) => {
    try {
      const tasks = await storage.getContentTasks();
      
      // Convert to CSV
      const headers = ['ID', 'Description', 'Status', 'Assigned To', 'Due Date', 'Priority', 'Client', 'Notes', 'Created At'];
      const rows = tasks.map(task => [
        task.id,
        `"${(task.description || '').replace(/"/g, '""')}"`,
        task.status,
        task.assignedTo || '',
        task.dueDate || '',
        task.priority || '',
        task.client || '',
        `"${(task.notes || '').replace(/"/g, '""')}"`,
        task.createdAt?.toISOString() || '',
      ]);

      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=tasks-export.csv');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting tasks:", error);
      res.status(500).json({ error: "Failed to export tasks" });
    }
  });

  // ================== WORKER MONITORING ENDPOINTS ==================

  // Get user's monitoring consent status
  app.get("/api/monitoring/consent", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const consent = await storage.getMonitoringConsent(userId);
      const hasValidConsent = await storage.hasValidConsent(userId);
      res.json({ consent, hasValidConsent });
    } catch (error) {
      console.error("Error fetching consent:", error);
      res.status(500).json({ error: "Failed to fetch consent status" });
    }
  });

  // Submit monitoring consent
  app.post("/api/monitoring/consent", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { 
        acknowledgedScreenCapture,
        acknowledgedActivityLogging,
        acknowledgedHourlyReports,
        acknowledgedDataStorage,
      } = req.body;

      // All acknowledgments must be true
      if (!acknowledgedScreenCapture || !acknowledgedActivityLogging || 
          !acknowledgedHourlyReports || !acknowledgedDataStorage) {
        return res.status(400).json({ error: "All acknowledgments are required" });
      }

      const consent = await storage.createMonitoringConsent({
        userId,
        consentVersion: "1.0",
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        acknowledgedScreenCapture: true,
        acknowledgedActivityLogging: true,
        acknowledgedHourlyReports: true,
        acknowledgedDataStorage: true,
      });

      res.json(consent);
    } catch (error) {
      console.error("Error creating consent:", error);
      res.status(500).json({ error: "Failed to submit consent" });
    }
  });

  // Get user's active monitoring session
  app.get("/api/monitoring/session/active", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const session = await storage.getActiveMonitoringSession(userId);
      res.json({ session });
    } catch (error) {
      console.error("Error fetching active session:", error);
      res.status(500).json({ error: "Failed to fetch active session" });
    }
  });

  // Start a monitoring session
  app.post("/api/monitoring/session/start", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check for valid consent
      const hasConsent = await storage.hasValidConsent(userId);
      if (!hasConsent) {
        return res.status(403).json({ error: "Valid consent required before starting monitoring" });
      }

      // Check for existing active session
      const existingSession = await storage.getActiveMonitoringSession(userId);
      if (existingSession) {
        return res.status(400).json({ error: "Already have an active monitoring session", session: existingSession });
      }

      const session = await storage.createMonitoringSession({
        userId,
        status: "active",
      });

      res.json(session);
    } catch (error) {
      console.error("Error starting session:", error);
      res.status(500).json({ error: "Failed to start monitoring session" });
    }
  });

  // End a monitoring session
  app.post("/api/monitoring/session/:id/end", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const sessionId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const session = await storage.getMonitoringSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to end this session" });
      }

      const endedSession = await storage.endMonitoringSession(sessionId);
      res.json(endedSession);
    } catch (error) {
      console.error("Error ending session:", error);
      res.status(500).json({ error: "Failed to end monitoring session" });
    }
  });

  // Upload a screenshot
  app.post("/api/monitoring/screenshot", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { sessionId, imageData, thumbnailData, ocrText, detectedApps, activityLevel } = req.body;

      if (!sessionId || !imageData) {
        return res.status(400).json({ error: "Session ID and image data are required" });
      }

      // Verify session belongs to user
      const session = await storage.getMonitoringSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(403).json({ error: "Invalid session" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ error: "Session is not active" });
      }

      // Create hour bucket for grouping
      const now = new Date();
      const hourBucket = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;

      const screenshot = await storage.createMonitoringScreenshot({
        sessionId,
        userId,
        imageData,
        thumbnailData: thumbnailData || null,
        ocrText: ocrText || null,
        detectedApps: detectedApps || null,
        activityLevel: activityLevel || "unknown",
        hourBucket,
      });

      res.json({ id: screenshot.id, hourBucket });
    } catch (error) {
      console.error("Error uploading screenshot:", error);
      res.status(500).json({ error: "Failed to upload screenshot" });
    }
  });

  // Get user's monitoring sessions
  app.get("/api/monitoring/sessions", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const sessions = await storage.getMonitoringSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Get user's hourly reports
  app.get("/api/monitoring/reports", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const reports = await storage.getMonitoringHourlyReports(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Create hourly report (usually called by frontend after hour completion)
  app.post("/api/monitoring/report", requireRole("content"), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { 
        sessionId, 
        hourStart, 
        hourEnd, 
        randomScreenshotId,
        activitySummary,
        topAppsDetected,
        activeMinutes,
        idleMinutes,
        screenshotsTaken,
        keywordsDetected,
      } = req.body;

      const report = await storage.createMonitoringHourlyReport({
        sessionId: sessionId || null,
        userId,
        hourStart: new Date(hourStart),
        hourEnd: new Date(hourEnd),
        randomScreenshotId: randomScreenshotId || null,
        activitySummary: activitySummary || null,
        topAppsDetected: topAppsDetected || null,
        activeMinutes: activeMinutes || 0,
        idleMinutes: idleMinutes || 0,
        screenshotsTaken: screenshotsTaken || 0,
        keywordsDetected: keywordsDetected || null,
      });

      res.json(report);
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  // Admin: Get all active monitoring sessions
  app.get("/api/admin/monitoring/sessions/active", requireRole("admin"), async (req, res) => {
    try {
      const sessions = await storage.getAllActiveMonitoringSessions();
      
      // Enrich with user info
      const enrichedSessions = await Promise.all(sessions.map(async (session) => {
        const user = await storage.getUser(session.userId);
        return {
          ...session,
          user: user ? { 
            id: user.id, 
            email: user.email, 
            firstName: user.firstName, 
            lastName: user.lastName 
          } : null,
        };
      }));

      res.json(enrichedSessions);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ error: "Failed to fetch active sessions" });
    }
  });

  // Admin: Get all monitoring sessions
  app.get("/api/admin/monitoring/sessions", requireRole("admin"), async (req, res) => {
    try {
      const sessions = await storage.getMonitoringSessions();
      
      // Enrich with user info
      const enrichedSessions = await Promise.all(sessions.map(async (session) => {
        const user = await storage.getUser(session.userId);
        return {
          ...session,
          user: user ? { 
            id: user.id, 
            email: user.email, 
            firstName: user.firstName, 
            lastName: user.lastName 
          } : null,
        };
      }));

      res.json(enrichedSessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Admin: Get all hourly reports
  app.get("/api/admin/monitoring/reports", requireRole("admin"), async (req, res) => {
    try {
      const reports = await storage.getMonitoringHourlyReports();
      
      // Enrich with user info and screenshot
      const enrichedReports = await Promise.all(reports.map(async (report) => {
        const user = await storage.getUser(report.userId);
        let screenshot = null;
        if (report.randomScreenshotId) {
          screenshot = await storage.getMonitoringScreenshot(report.randomScreenshotId);
        }
        return {
          ...report,
          user: user ? { 
            id: user.id, 
            email: user.email, 
            firstName: user.firstName, 
            lastName: user.lastName 
          } : null,
          screenshot: screenshot ? {
            id: screenshot.id,
            thumbnailData: screenshot.thumbnailData,
            capturedAt: screenshot.capturedAt,
          } : null,
        };
      }));

      res.json(enrichedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Admin: Get specific screenshot
  app.get("/api/admin/monitoring/screenshot/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const screenshot = await storage.getMonitoringScreenshot(id);
      
      if (!screenshot) {
        return res.status(404).json({ error: "Screenshot not found" });
      }

      res.json(screenshot);
    } catch (error) {
      console.error("Error fetching screenshot:", error);
      res.status(500).json({ error: "Failed to fetch screenshot" });
    }
  });

  // Admin: Get session screenshots
  app.get("/api/admin/monitoring/session/:id/screenshots", requireRole("admin"), async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const screenshots = await storage.getMonitoringScreenshots(sessionId);
      
      // Return only thumbnails and metadata for performance
      const summaryScreenshots = screenshots.map(s => ({
        id: s.id,
        capturedAt: s.capturedAt,
        thumbnailData: s.thumbnailData,
        ocrText: s.ocrText?.substring(0, 200), // First 200 chars
        detectedApps: s.detectedApps,
        activityLevel: s.activityLevel,
      }));

      res.json(summaryScreenshots);
    } catch (error) {
      console.error("Error fetching screenshots:", error);
      res.status(500).json({ error: "Failed to fetch screenshots" });
    }
  });

  // Admin: Get real-time activity feed (recent screenshots from all active workers)
  app.get("/api/admin/monitoring/activity-feed", requireRole("admin"), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activeSessions = await storage.getAllActiveMonitoringSessions();
      
      // Get recent screenshots from all active sessions
      const allScreenshots: any[] = [];
      
      for (const session of activeSessions) {
        const screenshots = await storage.getMonitoringScreenshots(session.id);
        const user = await storage.getUser(session.userId);
        
        // Get the last few screenshots from each session
        const recentScreenshots = screenshots.slice(-5).map(s => ({
          id: s.id,
          sessionId: session.id,
          capturedAt: s.capturedAt,
          thumbnailData: s.thumbnailData,
          detectedApps: s.detectedApps,
          activityLevel: s.activityLevel,
          user: user ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          } : null,
        }));
        
        allScreenshots.push(...recentScreenshots);
      }
      
      // Sort by capture time, most recent first
      allScreenshots.sort((a, b) => 
        new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
      );
      
      // Return limited results
      res.json(allScreenshots.slice(0, limit));
    } catch (error) {
      console.error("Error fetching activity feed:", error);
      res.status(500).json({ error: "Failed to fetch activity feed" });
    }
  });

  // Admin: Get app usage summary across all monitoring
  app.get("/api/admin/monitoring/app-summary", requireRole("admin"), async (req, res) => {
    try {
      const reports = await storage.getMonitoringHourlyReports();
      
      // Aggregate app usage across all reports
      const appCounts: Record<string, number> = {};
      let totalActiveMinutes = 0;
      let totalIdleMinutes = 0;
      
      for (const report of reports) {
        totalActiveMinutes += report.activeMinutes || 0;
        totalIdleMinutes += report.idleMinutes || 0;
        
        if (report.topAppsDetected) {
          for (const app of report.topAppsDetected) {
            appCounts[app] = (appCounts[app] || 0) + 1;
          }
        }
      }
      
      // Sort apps by usage count
      const sortedApps = Object.entries(appCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20);
      
      res.json({
        topApps: sortedApps.map(([name, count]) => ({ name, count })),
        totalActiveMinutes,
        totalIdleMinutes,
        totalReports: reports.length,
      });
    } catch (error) {
      console.error("Error fetching app summary:", error);
      res.status(500).json({ error: "Failed to fetch app summary" });
    }
  });

  // ==================== PAYMENT REQUEST ENDPOINTS ====================

  // Get payment requests - content users see their own, admins see all
  app.get("/api/payment-requests", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      if (user.role === "admin") {
        // Admins see all requests
        const requests = await storage.getPaymentRequests();
        // Enrich with requester info
        const enriched = await Promise.all(requests.map(async (request) => {
          const requester = await storage.getUser(request.requesterId);
          let reviewer = null;
          if (request.adminReviewerId) {
            reviewer = await storage.getUser(request.adminReviewerId);
          }
          return {
            ...request,
            requester: requester ? {
              id: requester.id,
              email: requester.email,
              firstName: requester.firstName,
              lastName: requester.lastName,
            } : null,
            reviewer: reviewer ? {
              id: reviewer.id,
              email: reviewer.email,
              firstName: reviewer.firstName,
              lastName: reviewer.lastName,
            } : null,
          };
        }));
        return res.json(enriched);
      } else {
        // Content users see only their own requests
        const requests = await storage.getPaymentRequests(user.id);
        // Enrich with reviewer info if approved/rejected
        const enriched = await Promise.all(requests.map(async (request) => {
          let reviewer = null;
          if (request.adminReviewerId) {
            reviewer = await storage.getUser(request.adminReviewerId);
          }
          return {
            ...request,
            reviewer: reviewer ? {
              id: reviewer.id,
              firstName: reviewer.firstName,
              lastName: reviewer.lastName,
            } : null,
          };
        }));
        return res.json(enriched);
      }
    } catch (error) {
      console.error("Error fetching payment requests:", error);
      res.status(500).json({ error: "Failed to fetch payment requests" });
    }
  });

  // Get single payment request with events timeline
  app.get("/api/payment-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const request = await storage.getPaymentRequest(id);
      if (!request) {
        return res.status(404).json({ error: "Payment request not found" });
      }
      
      // Check permission - only requester or admin can view
      if (user.role !== "admin" && request.requesterId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get events timeline
      const events = await storage.getPaymentRequestEvents(id);
      
      // Enrich with user info
      const requester = await storage.getUser(request.requesterId);
      let reviewer = null;
      if (request.adminReviewerId) {
        reviewer = await storage.getUser(request.adminReviewerId);
      }
      
      // Enrich events with actor info
      const enrichedEvents = await Promise.all(events.map(async (event) => {
        const actor = await storage.getUser(event.actorId);
        return {
          ...event,
          actor: actor ? {
            id: actor.id,
            firstName: actor.firstName,
            lastName: actor.lastName,
          } : null,
        };
      }));
      
      res.json({
        ...request,
        requester: requester ? {
          id: requester.id,
          email: requester.email,
          firstName: requester.firstName,
          lastName: requester.lastName,
        } : null,
        reviewer: reviewer ? {
          id: reviewer.id,
          firstName: reviewer.firstName,
          lastName: reviewer.lastName,
        } : null,
        events: enrichedEvents,
      });
    } catch (error) {
      console.error("Error fetching payment request:", error);
      res.status(500).json({ error: "Failed to fetch payment request" });
    }
  });

  // Create new payment request - content users only
  app.post("/api/payment-requests", requireRole("content"), async (req, res) => {
    try {
      const user = req.user!;
      const { amount, currency, reason, description } = req.body;
      
      if (!amount || !reason) {
        return res.status(400).json({ error: "Amount and reason are required" });
      }
      
      // Create the payment request
      const request = await storage.createPaymentRequest({
        requesterId: user.id,
        amount: String(amount),
        currency: currency || "USD",
        reason,
        description: description || null,
      });
      
      // Create initial event
      await storage.createPaymentRequestEvent({
        paymentRequestId: request.id,
        actorId: user.id,
        eventType: "created",
        previousStatus: null,
        newStatus: "pending",
        note: null,
      });
      
      // Notify admins
      const admins = (await storage.getAllUsers()).filter(u => u.role === "admin");
      const requesterName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
      
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "payment_request",
          title: "New Payment Request",
          message: `${requesterName} submitted a payment request for ${currency || "USD"} ${amount}`,
          metadata: JSON.stringify({ paymentRequestId: request.id }),
        });
      }
      
      // Send external notifications
      try {
        await channelNotificationService.sendPaymentRequestNotification(
          "created",
          request,
          requesterName
        );
      } catch (notifyError) {
        console.error("Error sending external notifications:", notifyError);
        // Don't fail the request if external notifications fail
      }
      
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating payment request:", error);
      res.status(500).json({ error: "Failed to create payment request" });
    }
  });

  // Update payment request status - admin approve/reject
  app.patch("/api/payment-requests/:id/status", requireRole("admin"), async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      const { status, note } = req.body;
      
      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
      }
      
      const existingRequest = await storage.getPaymentRequest(id);
      if (!existingRequest) {
        return res.status(404).json({ error: "Payment request not found" });
      }
      
      if (existingRequest.status !== "pending") {
        return res.status(400).json({ error: "Can only update pending requests" });
      }
      
      // Update the status
      const updated = await storage.updatePaymentRequestStatus(id, status, user.id, note);
      
      if (!updated) {
        return res.status(500).json({ error: "Failed to update request" });
      }
      
      // Create event
      await storage.createPaymentRequestEvent({
        paymentRequestId: id,
        actorId: user.id,
        eventType: status,
        previousStatus: "pending",
        newStatus: status,
        note: note || null,
      });
      
      // Notify the requester
      const requester = await storage.getUser(existingRequest.requesterId);
      const adminName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
      
      if (requester) {
        await storage.createNotification({
          userId: requester.id,
          type: "payment_request",
          title: `Payment Request ${status === "approved" ? "Approved" : "Rejected"}`,
          message: `Your payment request for ${existingRequest.currency} ${existingRequest.amount} has been ${status} by ${adminName}${note ? `: ${note}` : ""}`,
          metadata: JSON.stringify({ paymentRequestId: id }),
        });
      }
      
      // Send external notifications
      try {
        const requesterName = requester ? [requester.firstName, requester.lastName].filter(Boolean).join(" ") || requester.email : "Unknown";
        await channelNotificationService.sendPaymentRequestNotification(
          status,
          updated,
          requesterName,
          adminName
        );
      } catch (notifyError) {
        console.error("Error sending external notifications:", notifyError);
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating payment request:", error);
      res.status(500).json({ error: "Failed to update payment request" });
    }
  });

  // Cancel payment request - requester can cancel their own pending request
  app.delete("/api/payment-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const id = parseInt(req.params.id);
      
      const existingRequest = await storage.getPaymentRequest(id);
      if (!existingRequest) {
        return res.status(404).json({ error: "Payment request not found" });
      }
      
      // Only requester can cancel their own pending request
      if (existingRequest.requesterId !== user.id) {
        return res.status(403).json({ error: "Can only cancel your own requests" });
      }
      
      if (existingRequest.status !== "pending") {
        return res.status(400).json({ error: "Can only cancel pending requests" });
      }
      
      const cancelled = await storage.cancelPaymentRequest(id, user.id);
      
      if (!cancelled) {
        return res.status(500).json({ error: "Failed to cancel request" });
      }
      
      // Create event
      await storage.createPaymentRequestEvent({
        paymentRequestId: id,
        actorId: user.id,
        eventType: "cancelled",
        previousStatus: "pending",
        newStatus: "cancelled",
        note: null,
      });
      
      // Notify admins
      const admins = (await storage.getAllUsers()).filter(u => u.role === "admin");
      const requesterName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
      
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "payment_request",
          title: "Payment Request Cancelled",
          message: `${requesterName} cancelled their payment request for ${existingRequest.currency} ${existingRequest.amount}`,
          metadata: JSON.stringify({ paymentRequestId: id }),
        });
      }
      
      res.json({ success: true, message: "Payment request cancelled" });
    } catch (error) {
      console.error("Error cancelling payment request:", error);
      res.status(500).json({ error: "Failed to cancel payment request" });
    }
  });

  // Get pending payment request count - for admin badge
  app.get("/api/payment-requests/pending/count", requireRole("admin"), async (req, res) => {
    try {
      const count = await storage.getPendingPaymentRequestCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching pending count:", error);
      res.status(500).json({ error: "Failed to fetch pending count" });
    }
  });

  // ================== BRAND PACKS ENDPOINTS ==================

  // Get all brand packs (content users see active only, admin sees all)
  app.get("/api/brand-packs", requireRole("content"), async (req, res) => {
    try {
      const user = (req as any).user;
      const activeOnly = user?.role !== "admin";
      const brandPacks = await storage.getClientBrandPacks(activeOnly);
      
      // Include file count for each brand pack
      const brandPacksWithCounts = await Promise.all(
        brandPacks.map(async (bp) => {
          const files = await storage.getBrandPackFiles(bp.id);
          return { ...bp, fileCount: files.length };
        })
      );
      
      res.json(brandPacksWithCounts);
    } catch (error) {
      console.error("Error fetching brand packs:", error);
      res.status(500).json({ error: "Failed to fetch brand packs" });
    }
  });

  // Get single brand pack with files
  app.get("/api/brand-packs/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const brandPack = await storage.getClientBrandPack(id);
      
      if (!brandPack) {
        return res.status(404).json({ error: "Brand pack not found" });
      }
      
      const files = await storage.getBrandPackFiles(id);
      res.json({ ...brandPack, files });
    } catch (error) {
      console.error("Error fetching brand pack:", error);
      res.status(500).json({ error: "Failed to fetch brand pack" });
    }
  });

  // Get brand pack by client name (for task integration)
  app.get("/api/brand-packs/by-client/:clientName", requireRole("content"), async (req, res) => {
    try {
      const clientName = decodeURIComponent(req.params.clientName);
      const brandPack = await storage.getClientBrandPackByName(clientName);
      
      if (!brandPack) {
        return res.status(404).json({ error: "Brand pack not found for this client" });
      }
      
      const files = await storage.getBrandPackFiles(brandPack.id);
      res.json({ ...brandPack, files });
    } catch (error) {
      console.error("Error fetching brand pack by client:", error);
      res.status(500).json({ error: "Failed to fetch brand pack" });
    }
  });

  // Create new brand pack (admin only)
  app.post("/api/brand-packs", requireRole("admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const { clientName, description, website, primaryColor, secondaryColor, notes } = req.body;
      
      if (!clientName || !clientName.trim()) {
        return res.status(400).json({ error: "Client name is required" });
      }
      
      // Check if client already exists
      const existing = await storage.getClientBrandPackByName(clientName.trim());
      if (existing) {
        return res.status(400).json({ error: "A brand pack for this client already exists" });
      }
      
      const brandPack = await storage.createClientBrandPack({
        clientName: clientName.trim(),
        description: description || null,
        website: website || null,
        primaryColor: primaryColor || null,
        secondaryColor: secondaryColor || null,
        notes: notes || null,
        isActive: true,
        createdBy: user?.id,
      });
      
      res.status(201).json(brandPack);
    } catch (error) {
      console.error("Error creating brand pack:", error);
      res.status(500).json({ error: "Failed to create brand pack" });
    }
  });

  // Update brand pack (admin only)
  app.patch("/api/brand-packs/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const updated = await storage.updateClientBrandPack(id, updates);
      
      if (!updated) {
        return res.status(404).json({ error: "Brand pack not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating brand pack:", error);
      res.status(500).json({ error: "Failed to update brand pack" });
    }
  });

  // Delete brand pack (admin only)
  app.delete("/api/brand-packs/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteClientBrandPack(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Brand pack not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting brand pack:", error);
      res.status(500).json({ error: "Failed to delete brand pack" });
    }
  });

  // Get files for a brand pack
  app.get("/api/brand-packs/:id/files", requireRole("content"), async (req, res) => {
    try {
      const brandPackId = parseInt(req.params.id);
      const files = await storage.getBrandPackFiles(brandPackId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching brand pack files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  // Upload file to brand pack (admin only)
  app.post("/api/brand-packs/:id/files", requireRole("admin"), upload.single("file"), async (req, res) => {
    try {
      const brandPackId = parseInt(req.params.id);
      const user = (req as any).user;
      
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }
      
      // Verify brand pack exists
      const brandPack = await storage.getClientBrandPack(brandPackId);
      if (!brandPack) {
        return res.status(404).json({ error: "Brand pack not found" });
      }
      
      const file = req.file;
      const { category, description } = req.body;
      
      // Upload to Google Drive
      const { uploadToGoogleDrive } = await import("./google-drive");
      const driveResult = await uploadToGoogleDrive(file.buffer, file.originalname, file.mimetype);
      
      // Generate a unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.originalname}`;
      
      const brandPackFile = await storage.createBrandPackFile({
        brandPackId,
        fileName,
        originalName: file.originalname,
        filePath: driveResult?.webViewLink || `/uploads/brand-packs/${fileName}`,
        fileSize: file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`,
        fileType: file.mimetype,
        category: category || "other",
        description: description || null,
        uploadedBy: user?.id,
      });
      
      res.status(201).json(brandPackFile);
    } catch (error) {
      console.error("Error uploading brand pack file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Update brand pack file metadata (admin only)
  app.patch("/api/brand-packs/files/:fileId", requireRole("admin"), async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const { category, description } = req.body;
      
      const updated = await storage.updateBrandPackFile(fileId, {
        category,
        description,
      });
      
      if (!updated) {
        return res.status(404).json({ error: "File not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating brand pack file:", error);
      res.status(500).json({ error: "Failed to update file" });
    }
  });

  // Delete brand pack file (admin only)
  app.delete("/api/brand-packs/files/:fileId", requireRole("admin"), async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const deleted = await storage.deleteBrandPackFile(fileId);
      
      if (!deleted) {
        return res.status(404).json({ error: "File not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting brand pack file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Download single file (content users)
  app.get("/api/brand-packs/files/:fileId/download", requireRole("content"), async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const file = await storage.getBrandPackFile(fileId);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Return the file info with download link
      res.json({
        fileName: file.originalName,
        filePath: file.filePath,
        fileType: file.fileType,
        fileSize: file.fileSize,
      });
    } catch (error) {
      console.error("Error fetching file for download:", error);
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });

  // ================== CLIENT WORK LIBRARY ENDPOINTS ==================

  // Get all client work items, optionally filtered by brand pack
  app.get("/api/client-work", requireRole("content"), async (req, res) => {
    try {
      const brandPackId = req.query.brandPackId ? parseInt(req.query.brandPackId as string) : undefined;
      const items = await storage.getClientWorkItems(brandPackId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching client work items:", error);
      res.status(500).json({ error: "Failed to fetch client work items" });
    }
  });

  // Get single client work item
  app.get("/api/client-work/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getClientWorkItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Work item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error fetching client work item:", error);
      res.status(500).json({ error: "Failed to fetch work item" });
    }
  });

  // Get work items by uploader
  app.get("/api/client-work/by-uploader/:uploaderId", requireRole("content"), async (req, res) => {
    try {
      const uploaderId = req.params.uploaderId;
      const items = await storage.getClientWorkItemsByUploader(uploaderId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching work items by uploader:", error);
      res.status(500).json({ error: "Failed to fetch work items" });
    }
  });

  // Get work items by task
  app.get("/api/client-work/by-task/:taskId", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const items = await storage.getClientWorkItemsByTask(taskId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching work items by task:", error);
      res.status(500).json({ error: "Failed to fetch work items" });
    }
  });

  // Get work items by campaign
  app.get("/api/client-work/by-campaign/:campaignId", requireRole("content"), async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const items = await storage.getClientWorkItemsByCampaign(campaignId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching work items by campaign:", error);
      res.status(500).json({ error: "Failed to fetch work items" });
    }
  });

  // Create client work item (content team uploads)
  app.post("/api/client-work", requireRole("content"), upload.single("file"), async (req, res) => {
    try {
      const user = (req as any).user;
      const file = req.file;
      const { brandPackId, title, description, category, taskId, campaignId, status } = req.body;
      
      if (!brandPackId || !title) {
        return res.status(400).json({ error: "Brand pack ID and title are required" });
      }
      
      if (!file) {
        return res.status(400).json({ error: "File is required" });
      }
      
      // Verify brand pack exists
      const brandPack = await storage.getClientBrandPack(parseInt(brandPackId));
      if (!brandPack) {
        return res.status(404).json({ error: "Brand pack not found" });
      }
      
      // Upload file to Google Drive if configured
      let filePath = `/uploads/client-work/${file.filename}`;
      let driveResult = null;
      
      try {
        driveResult = await driveService.uploadFile(
          file.path,
          file.originalname,
          `client-work/${brandPack.clientName}`,
          file.mimetype
        );
        if (driveResult?.webViewLink) {
          filePath = driveResult.webViewLink;
        }
      } catch (driveError) {
        console.error("Drive upload failed, using local storage:", driveError);
      }
      
      const workItem = await storage.createClientWorkItem({
        brandPackId: parseInt(brandPackId),
        title,
        description: description || null,
        category: category || "other",
        fileName: file.filename,
        originalName: file.originalname,
        filePath,
        fileSize: formatFileSize(file.size),
        fileType: file.mimetype,
        status: status || "draft",
        uploadedBy: user.id,
        taskId: taskId ? parseInt(taskId) : null,
        campaignId: campaignId ? parseInt(campaignId) : null,
      });
      
      res.status(201).json(workItem);
    } catch (error) {
      console.error("Error creating client work item:", error);
      res.status(500).json({ error: "Failed to create work item" });
    }
  });

  // Update client work item
  app.patch("/api/client-work/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = (req as any).user;
      const { title, description, category, status, taskId, campaignId } = req.body;
      
      const existing = await storage.getClientWorkItem(id);
      if (!existing) {
        return res.status(404).json({ error: "Work item not found" });
      }
      
      // Only uploader or admin can update
      if (existing.uploadedBy !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to update this work item" });
      }
      
      const updated = await storage.updateClientWorkItem(id, {
        title,
        description,
        category,
        status,
        taskId: taskId ? parseInt(taskId) : undefined,
        campaignId: campaignId ? parseInt(campaignId) : undefined,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating client work item:", error);
      res.status(500).json({ error: "Failed to update work item" });
    }
  });

  // Delete client work item
  app.delete("/api/client-work/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = (req as any).user;
      
      const existing = await storage.getClientWorkItem(id);
      if (!existing) {
        return res.status(404).json({ error: "Work item not found" });
      }
      
      // Only uploader or admin can delete
      if (existing.uploadedBy !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to delete this work item" });
      }
      
      await storage.deleteClientWorkItem(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting client work item:", error);
      res.status(500).json({ error: "Failed to delete work item" });
    }
  });

  // Get work stats (activity visibility)
  app.get("/api/client-work/stats", requireRole("content"), async (req, res) => {
    try {
      const stats = await storage.getClientWorkStats();
      
      // Enrich with user and brand pack info
      const enrichedStats = await Promise.all(stats.map(async (stat) => {
        const user = await storage.getUser(stat.uploaderId);
        const brandPack = stat.brandPackId ? await storage.getClientBrandPack(stat.brandPackId) : null;
        return {
          ...stat,
          uploaderName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown',
          uploaderEmail: user?.email,
          clientName: brandPack?.clientName || 'Unknown Client',
        };
      }));
      
      res.json(enrichedStats);
    } catch (error) {
      console.error("Error fetching work stats:", error);
      res.status(500).json({ error: "Failed to fetch work stats" });
    }
  });

  // ================== DISCORD INTEGRATION ENDPOINTS ==================

  // Get current user's Discord connection
  app.get("/api/discord/connection", requireRole("content"), async (req, res) => {
    try {
      const user = (req as any).user;
      const connection = await storage.getDiscordConnection(user.id);
      res.json(connection || null);
    } catch (error) {
      console.error("Error fetching Discord connection:", error);
      res.status(500).json({ error: "Failed to fetch Discord connection" });
    }
  });

  // Link Discord account (manual linking for now)
  app.post("/api/discord/link", requireRole("content"), async (req, res) => {
    try {
      const user = (req as any).user;
      const { discordUserId, discordUsername } = req.body;

      if (!discordUserId) {
        return res.status(400).json({ error: "Discord user ID is required" });
      }

      // Check if already linked
      const existing = await storage.getDiscordConnection(user.id);
      if (existing) {
        // Update existing connection
        const updated = await storage.updateDiscordConnection(user.id, {
          discordUserId,
          discordUsername,
        });
        return res.json(updated);
      }

      // Create new connection
      const connection = await storage.createDiscordConnection({
        userId: user.id,
        discordUserId,
        discordUsername,
      });
      res.json(connection);
    } catch (error) {
      console.error("Error linking Discord account:", error);
      res.status(500).json({ error: "Failed to link Discord account" });
    }
  });

  // Unlink Discord account
  app.delete("/api/discord/connection", requireRole("content"), async (req, res) => {
    try {
      const user = (req as any).user;
      await storage.deleteDiscordConnection(user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unlinking Discord account:", error);
      res.status(500).json({ error: "Failed to unlink Discord account" });
    }
  });

  // Get all Discord connections (admin only)
  app.get("/api/discord/connections", requireRole("admin"), async (req, res) => {
    try {
      const connections = await storage.getAllDiscordConnections();
      
      // Enrich with user info
      const enriched = await Promise.all(connections.map(async (conn) => {
        const user = await storage.getUser(conn.userId);
        return {
          ...conn,
          userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown',
          userEmail: user?.email,
        };
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching Discord connections:", error);
      res.status(500).json({ error: "Failed to fetch Discord connections" });
    }
  });

  // Get active presence sessions (who is screen sharing now)
  app.get("/api/discord/presence", requireRole("content"), async (req, res) => {
    try {
      const sessions = await storage.getActivePresenceSessions();
      
      // Enrich with user info
      const enriched = await Promise.all(sessions.map(async (session) => {
        const user = await storage.getUser(session.userId);
        const connection = await storage.getDiscordConnection(session.userId);
        return {
          ...session,
          userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown',
          userEmail: user?.email,
          discordUsername: connection?.discordUsername,
        };
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching presence sessions:", error);
      res.status(500).json({ error: "Failed to fetch presence sessions" });
    }
  });

  // Get current user's presence history
  app.get("/api/discord/presence/history", requireRole("content"), async (req, res) => {
    try {
      const user = (req as any).user;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getUserPresenceHistory(user.id, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching presence history:", error);
      res.status(500).json({ error: "Failed to fetch presence history" });
    }
  });

  // Get Discord settings (admin only)
  app.get("/api/discord/settings", requireRole("admin"), async (req, res) => {
    try {
      const settings = await storage.getDiscordSettings();
      res.json(settings || null);
    } catch (error) {
      console.error("Error fetching Discord settings:", error);
      res.status(500).json({ error: "Failed to fetch Discord settings" });
    }
  });

  // Update Discord settings (admin only)
  app.post("/api/discord/settings", requireRole("admin"), async (req, res) => {
    try {
      const { guildId, guildName, monitoredChannelIds } = req.body;

      if (!guildId) {
        return res.status(400).json({ error: "Guild ID is required" });
      }

      const existing = await storage.getDiscordSettings();
      if (existing) {
        const updated = await storage.updateDiscordSettings(existing.id, {
          guildId,
          guildName,
          monitoredChannelIds,
        });
        return res.json(updated);
      }

      const settings = await storage.createDiscordSettings({
        guildId,
        guildName,
        monitoredChannelIds,
      });
      res.json(settings);
    } catch (error) {
      console.error("Error updating Discord settings:", error);
      res.status(500).json({ error: "Failed to update Discord settings" });
    }
  });

  // ================== SHEETS HUB ENDPOINTS ==================

  // Get all connected sheets (admin only)
  app.get("/api/sheets-hub", requireRole("admin"), async (req, res) => {
    try {
      const sheets = await storage.getConnectedSheets();
      res.json(sheets);
    } catch (error) {
      console.error("Error fetching connected sheets:", error);
      res.status(500).json({ error: "Failed to fetch connected sheets" });
    }
  });

  // Get single connected sheet with details
  app.get("/api/sheets-hub/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sheet = await storage.getConnectedSheet(id);
      
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }
      
      // Get sync logs and record counts
      const syncLogs = await storage.getSheetSyncLogs(id, 10);
      let recordCount = 0;
      
      if (sheet.sheetType === "payroll") {
        const records = await storage.getPayrollRecords(id);
        recordCount = records.length;
      } else if (sheet.sheetType === "tasks") {
        const tasks = await storage.getMultiColumnTasks(id);
        recordCount = tasks.length;
      }
      
      res.json({ ...sheet, syncLogs, recordCount });
    } catch (error) {
      console.error("Error fetching sheet details:", error);
      res.status(500).json({ error: "Failed to fetch sheet details" });
    }
  });

  // Connect a new sheet (admin only)
  app.post("/api/sheets-hub", requireRole("admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const { name, sheetUrl, sheetType, tabName, description, syncDirection } = req.body;
      
      if (!name || !sheetUrl) {
        return res.status(400).json({ error: "Name and sheet URL are required" });
      }
      
      // Ensure Google Sheets service is initialized
      if (!googleSheetsService.isAuthConfigured()) {
        try {
          await googleSheetsService.initialize();
        } catch (initError) {
          console.error("Failed to initialize Google Sheets:", initError);
          return res.status(500).json({ error: "Google Sheets not configured. Please check service account credentials." });
        }
      }
      
      // Extract sheet ID from URL
      const sheetId = googleSheetsService.extractSheetId(sheetUrl);
      
      // Check if already connected
      const existing = await storage.getConnectedSheetBySheetId(sheetId);
      if (existing) {
        return res.status(400).json({ error: "This sheet is already connected" });
      }
      
      // Verify sheet is accessible
      try {
        await googleSheetsService.getSheetMetadata(sheetId);
      } catch (error: any) {
        return res.status(400).json({ error: error.message || "Cannot access sheet. Make sure it's shared with the service account." });
      }
      
      const connectedSheet = await storage.createConnectedSheet({
        name,
        sheetId,
        sheetUrl,
        sheetType: sheetType || "custom",
        tabName: tabName || null,
        description: description || null,
        syncDirection: syncDirection || "both",
        isActive: true,
        createdBy: user?.id,
      });
      
      res.status(201).json(connectedSheet);
    } catch (error) {
      console.error("Error connecting sheet:", error);
      res.status(500).json({ error: "Failed to connect sheet" });
    }
  });

  // Update connected sheet (admin only)
  app.patch("/api/sheets-hub/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, tabName, description, sheetType, syncDirection, isActive } = req.body;
      
      const updated = await storage.updateConnectedSheet(id, {
        name,
        tabName,
        description,
        sheetType,
        syncDirection,
        isActive,
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Sheet not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating connected sheet:", error);
      res.status(500).json({ error: "Failed to update sheet" });
    }
  });

  // Delete connected sheet (admin only)
  app.delete("/api/sheets-hub/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteConnectedSheet(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Sheet not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting connected sheet:", error);
      res.status(500).json({ error: "Failed to delete sheet" });
    }
  });

  // Get sheet metadata (tabs, title) - for previewing before connecting
  app.post("/api/sheets-hub/preview", requireRole("admin"), async (req, res) => {
    try {
      const { sheetUrl } = req.body;
      
      if (!sheetUrl) {
        return res.status(400).json({ error: "Sheet URL is required" });
      }
      
      // Ensure Google Sheets service is initialized for Sheets Hub operations
      if (!googleSheetsService.isAuthConfigured()) {
        try {
          await googleSheetsService.initialize();
        } catch (initError) {
          console.error("Failed to initialize Google Sheets:", initError);
          return res.status(500).json({ error: "Google Sheets not configured. Please check service account credentials." });
        }
        
        if (!googleSheetsService.isAuthConfigured()) {
          return res.status(500).json({ error: "Google Sheets service could not be initialized. Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY." });
        }
      }
      
      const sheetId = googleSheetsService.extractSheetId(sheetUrl);
      const metadata = await googleSheetsService.getSheetMetadata(sheetId);
      
      res.json({ sheetId, ...metadata });
    } catch (error: any) {
      console.error("Error previewing sheet:", error);
      res.status(400).json({ error: error.message || "Failed to preview sheet" });
    }
  });

  // Sync sheet data (pull from Google Sheets to database)
  app.post("/api/sheets-hub/:id/sync", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = (req as any).user;
      
      const sheet = await storage.getConnectedSheet(id);
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }
      
      // Ensure Google Sheets service is initialized for Sheets Hub operations
      if (!googleSheetsService.isAuthConfigured()) {
        try {
          await googleSheetsService.initialize();
        } catch (initError) {
          console.error("Failed to initialize Google Sheets:", initError);
          return res.status(500).json({ error: "Google Sheets not configured. Please check service account credentials." });
        }
        
        if (!googleSheetsService.isAuthConfigured()) {
          return res.status(500).json({ error: "Google Sheets service could not be initialized. Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY." });
        }
      }
      
      // Create sync log
      const syncLog = await storage.createSheetSyncLog({
        connectedSheetId: id,
        syncType: "pull",
        status: "pending",
        initiatedBy: user?.id,
      });
      
      try {
        let recordsProcessed = 0;
        let recordsCreated = 0;
        
        if (sheet.sheetType === "payroll") {
          // Clear existing records for this sheet
          await storage.deletePayrollRecordsBySheet(id);
          
          // Pull payroll data
          const payrollData = await googleSheetsService.readPayrollSheet(sheet.sheetId, sheet.tabName || undefined);
          
          // Filter out empty rows
          const validRecords = payrollData.filter(r => r.entityName && r.entityName !== "Unknown");
          
          if (validRecords.length > 0) {
            const records = validRecords.map(r => ({
              connectedSheetId: id,
              entityName: r.entityName,
              walletAddress: r.walletAddress,
              inflowItem: r.inflowItem,
              amountIn: r.amountIn,
              amountOut: r.amountOut,
              tokenType: r.tokenType,
              tokenAddress: r.tokenAddress,
              receiver: r.receiver,
              rawAmount: r.rawAmount,
              sheetRowId: r.sheetRowId,
              sheetRowIndex: r.rowIndex,
            }));
            
            await storage.createPayrollRecordsBulk(records);
            recordsCreated = records.length;
          }
          
          recordsProcessed = payrollData.length;
        } else if (sheet.sheetType === "tasks") {
          // Clear existing tasks for this sheet
          await storage.deleteMultiColumnTasksBySheet(id);
          
          // Pull task data
          const taskData = await googleSheetsService.readMultiColumnTaskSheet(sheet.sheetId, sheet.tabName || undefined);
          
          if (taskData.length > 0) {
            const tasks = taskData.map(t => ({
              connectedSheetId: id,
              columnName: t.columnName,
              taskDescription: t.taskDescription,
              rowIndex: t.rowIndex,
            }));
            
            await storage.createMultiColumnTasksBulk(tasks);
            recordsCreated = tasks.length;
          }
          
          recordsProcessed = taskData.length;
        } else if (sheet.sheetType === "data" || sheet.sheetType === "custom") {
          // Generic data sync - read headers and all rows
          const sheetData = await googleSheetsService.readDataSheet(sheet.sheetId, sheet.tabName || undefined);
          
          // Store the data in the connected sheet record
          await storage.updateConnectedSheet(id, {
            cachedHeaders: sheetData.headers,
            cachedData: JSON.stringify(sheetData.rows),
          });
          
          recordsProcessed = sheetData.rows.length;
          recordsCreated = sheetData.rows.length;
        }
        
        // Update sync log with success
        await storage.updateSheetSyncLog(syncLog.id, {
          status: "success",
          recordsProcessed,
          recordsCreated,
        });
        
        // Update sheet sync status
        await storage.updateSheetSyncStatus(id, "success", `Synced ${recordsCreated} records`);
        
        res.json({
          success: true,
          recordsProcessed,
          recordsCreated,
          message: `Successfully synced ${recordsCreated} records from sheet`,
        });
      } catch (syncError: any) {
        // Update sync log with error
        await storage.updateSheetSyncLog(syncLog.id, {
          status: "error",
          errorMessage: syncError.message,
        });
        
        // Update sheet sync status
        await storage.updateSheetSyncStatus(id, "error", syncError.message);
        
        throw syncError;
      }
    } catch (error: any) {
      console.error("Error syncing sheet:", error);
      res.status(500).json({ error: error.message || "Failed to sync sheet" });
    }
  });

  // Get payroll records for a sheet
  app.get("/api/sheets-hub/:id/payroll", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const records = await storage.getPayrollRecords(id);
      res.json(records);
    } catch (error) {
      console.error("Error fetching payroll records:", error);
      res.status(500).json({ error: "Failed to fetch payroll records" });
    }
  });

  // Get payroll aggregations
  app.get("/api/sheets-hub/:id/payroll/aggregations", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const aggregations = await storage.getPayrollAggregations(id);
      res.json(aggregations);
    } catch (error) {
      console.error("Error fetching payroll aggregations:", error);
      res.status(500).json({ error: "Failed to fetch aggregations" });
    }
  });

  // Get all payroll aggregations (across all sheets)
  app.get("/api/sheets-hub/payroll/all-aggregations", requireRole("admin"), async (req, res) => {
    try {
      const aggregations = await storage.getPayrollAggregations();
      res.json(aggregations);
    } catch (error) {
      console.error("Error fetching all payroll aggregations:", error);
      res.status(500).json({ error: "Failed to fetch aggregations" });
    }
  });

  // Get multi-column tasks for a sheet
  app.get("/api/sheets-hub/:id/tasks", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tasksByColumn = await storage.getMultiColumnTasksByColumn(id);
      res.json(tasksByColumn);
    } catch (error) {
      console.error("Error fetching multi-column tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get cached data for a data or custom type sheet
  app.get("/api/sheets-hub/:id/data", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sheet = await storage.getConnectedSheet(id);
      
      if (!sheet) {
        return res.status(404).json({ error: "Sheet not found" });
      }
      
      if (sheet.sheetType !== "data" && sheet.sheetType !== "custom") {
        return res.status(400).json({ error: "Sheet is not a data type" });
      }
      
      const headers = sheet.cachedHeaders || [];
      const rows = sheet.cachedData ? JSON.parse(sheet.cachedData) : [];
      
      res.json({ headers, rows });
    } catch (error) {
      console.error("Error fetching cached data:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // Get sync logs for a sheet
  app.get("/api/sheets-hub/:id/logs", requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 20;
      const logs = await storage.getSheetSyncLogs(id, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
      res.status(500).json({ error: "Failed to fetch sync logs" });
    }
  });

  // ================== CLIENT CREDITS ENDPOINTS ==================

  // Get all client credits (admin only)
  app.get("/api/client-credits", requireRole("admin"), async (req, res) => {
    try {
      const credits = await storage.getClientCredits();
      
      // Fetch user info for each credit record
      const creditsWithUsers = await Promise.all(
        credits.map(async (credit) => {
          const user = await storage.getUser(credit.userId);
          return {
            ...credit,
            user: user ? {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
            } : null,
          };
        })
      );
      
      res.json(creditsWithUsers);
    } catch (error) {
      console.error("Error fetching client credits:", error);
      res.status(500).json({ error: "Failed to fetch client credits" });
    }
  });

  // Get credit balance for current user (content users can see their own balance)
  app.get("/api/client-credits/my-balance", requireRole("content"), async (req, res) => {
    try {
      const user = (req as any).user;
      const credit = await storage.getClientCredit(user.id);
      
      if (!credit) {
        // Return zero balance if no credit record exists
        return res.json({
          balance: 0,
          currency: "USD",
          transactions: [],
        });
      }
      
      // Get recent transactions
      const transactions = await storage.getCreditTransactions(user.id, 10);
      
      res.json({
        balance: credit.balance,
        currency: credit.currency,
        notes: credit.notes,
        transactions,
      });
    } catch (error) {
      console.error("Error fetching user credit balance:", error);
      res.status(500).json({ error: "Failed to fetch credit balance" });
    }
  });

  // Get credit for a specific user (admin only)
  app.get("/api/client-credits/:userId", requireRole("admin"), async (req, res) => {
    try {
      const { userId } = req.params;
      const credit = await storage.getClientCredit(userId);
      const user = await storage.getUser(userId);
      
      if (!credit) {
        return res.json({
          userId,
          balance: 0,
          currency: "USD",
          notes: null,
          user: user ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          } : null,
          transactions: [],
        });
      }
      
      const transactions = await storage.getCreditTransactions(userId, 50);
      
      res.json({
        ...credit,
        user: user ? {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        } : null,
        transactions,
      });
    } catch (error) {
      console.error("Error fetching client credit:", error);
      res.status(500).json({ error: "Failed to fetch credit" });
    }
  });

  // Add credit to a user's account (admin only)
  app.post("/api/client-credits/:userId/add", requireRole("admin"), async (req, res) => {
    try {
      const { userId } = req.params;
      const { amount, description } = req.body;
      const admin = (req as any).user;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Amount must be a positive number" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Convert amount to cents if given in dollars
      const amountInCents = Math.round(amount * 100);
      
      const credit = await storage.addClientCredit(
        userId,
        amountInCents,
        description || "Credit added by admin",
        admin.id
      );
      
      res.json({
        ...credit,
        message: `Successfully added $${amount.toFixed(2)} credit to account`,
      });
    } catch (error: any) {
      console.error("Error adding credit:", error);
      res.status(500).json({ error: error.message || "Failed to add credit" });
    }
  });

  // Deduct credit from a user's account (admin only)
  app.post("/api/client-credits/:userId/deduct", requireRole("admin"), async (req, res) => {
    try {
      const { userId } = req.params;
      const { amount, description, taskId } = req.body;
      const admin = (req as any).user;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Amount must be a positive number" });
      }
      
      // Convert amount to cents if given in dollars
      const amountInCents = Math.round(amount * 100);
      
      const credit = await storage.deductClientCredit(
        userId,
        amountInCents,
        description || "Credit deducted by admin",
        taskId || undefined,
        admin.id
      );
      
      res.json({
        ...credit,
        message: `Successfully deducted $${amount.toFixed(2)} credit from account`,
      });
    } catch (error: any) {
      console.error("Error deducting credit:", error);
      res.status(500).json({ error: error.message || "Failed to deduct credit" });
    }
  });

  // Update credit notes (admin only)
  app.patch("/api/client-credits/:userId/notes", requireRole("admin"), async (req, res) => {
    try {
      const { userId } = req.params;
      const { notes } = req.body;
      
      // Get or create credit record
      let credit = await storage.getClientCredit(userId);
      
      if (!credit) {
        credit = await storage.createClientCredit({
          userId,
          balance: 0,
          currency: "USD",
          notes,
        });
      } else {
        credit = await storage.updateClientCredit(userId, { notes });
      }
      
      res.json(credit);
    } catch (error: any) {
      console.error("Error updating credit notes:", error);
      res.status(500).json({ error: error.message || "Failed to update notes" });
    }
  });

  // Get transaction history for a user (admin only)
  app.get("/api/client-credits/:userId/transactions", requireRole("admin"), async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await storage.getCreditTransactions(userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Get all users for credit management (admin only)
  app.get("/api/client-credits/eligible-users", requireRole("admin"), async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      // All registered users are eligible for credits
      const eligibleUsers = allUsers.filter(u => u.role);
      
      // Get their credit info too
      const usersWithCredits = await Promise.all(
        eligibleUsers.map(async (user) => {
          const credit = await storage.getClientCredit(user.id);
          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            roleContent: user.role === "content",
            roleAdmin: user.role === "admin",
            roleWeb3: user.role === "web3",
            balance: credit?.balance || 0,
            currency: credit?.currency || "USD",
          };
        })
      );
      
      res.json(usersWithCredits);
    } catch (error) {
      console.error("Error fetching eligible users:", error);
      res.status(500).json({ error: "Failed to fetch eligible users" });
    }
  });

  // ==================== CREDIT REQUESTS ROUTES ====================

  // Get all credit requests (admin) or own requests (client)
  app.get("/api/credit-requests", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      if (user.role === "admin") {
        const requests = await storage.getCreditRequests();
        res.json(requests);
      } else {
        const requests = await storage.getCreditRequests(user.id);
        res.json(requests);
      }
    } catch (error) {
      console.error("Error fetching credit requests:", error);
      res.status(500).json({ error: "Failed to fetch credit requests" });
    }
  });

  // Get pending credit requests (admin only)
  app.get("/api/credit-requests/pending", requireRole("admin"), async (req, res) => {
    try {
      const requests = await storage.getPendingCreditRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      res.status(500).json({ error: "Failed to fetch pending requests" });
    }
  });

  // Create a new credit request (client)
  app.post("/api/credit-requests", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { amount, currency, reason, description } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Amount must be positive" });
      }
      if (!reason) {
        return res.status(400).json({ error: "Reason is required" });
      }
      
      const request = await storage.createCreditRequest({
        requesterId: user.id,
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency || "USD",
        reason,
        description,
      });
      
      res.status(201).json(request);
    } catch (error: any) {
      console.error("Error creating credit request:", error);
      res.status(500).json({ error: error.message || "Failed to create request" });
    }
  });

  // Cancel a credit request (owner only)
  app.post("/api/credit-requests/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      
      const cancelled = await storage.cancelCreditRequest(id, user.id);
      if (!cancelled) {
        return res.status(400).json({ error: "Cannot cancel this request" });
      }
      
      res.json(cancelled);
    } catch (error: any) {
      console.error("Error cancelling request:", error);
      res.status(500).json({ error: error.message || "Failed to cancel request" });
    }
  });

  // Approve a credit request (admin only)
  app.post("/api/credit-requests/:id/approve", requireRole("admin"), async (req, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const { approvedAmount, note } = req.body;
      
      if (!approvedAmount || approvedAmount <= 0) {
        return res.status(400).json({ error: "Approved amount must be positive" });
      }
      
      const approved = await storage.approveCreditRequest(
        id,
        user.id,
        Math.round(approvedAmount * 100), // Convert to cents
        note
      );
      
      if (!approved) {
        return res.status(400).json({ error: "Cannot approve this request" });
      }
      
      res.json(approved);
    } catch (error: any) {
      console.error("Error approving request:", error);
      res.status(500).json({ error: error.message || "Failed to approve request" });
    }
  });

  // Reject a credit request (admin only)
  app.post("/api/credit-requests/:id/reject", requireRole("admin"), async (req, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const { note } = req.body;
      
      const rejected = await storage.rejectCreditRequest(id, user.id, note);
      if (!rejected) {
        return res.status(400).json({ error: "Cannot reject this request" });
      }
      
      res.json(rejected);
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      res.status(500).json({ error: error.message || "Failed to reject request" });
    }
  });

  // ==================== CONTENT ORDERS ROUTES ====================

  // Get all content orders (admin) or own orders (client)
  app.get("/api/content-orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      if (user.role === "admin") {
        const orders = await storage.getContentOrders();
        res.json(orders);
      } else {
        const orders = await storage.getContentOrders(user.id);
        res.json(orders);
      }
    } catch (error) {
      console.error("Error fetching content orders:", error);
      res.status(500).json({ error: "Failed to fetch content orders" });
    }
  });

  // Get orders assigned to current team member
  app.get("/api/content-orders/assigned-to-me", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const orders = await storage.getOrdersForTeamMember(user.id);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching assigned orders:", error);
      res.status(500).json({ error: "Failed to fetch assigned orders" });
    }
  });

  // Get a specific content order
  app.get("/api/content-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      
      const order = await storage.getContentOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Check permissions
      if (user.role !== "admin" && order.clientId !== user.id && order.assignedTo !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Create a new content order (draft)
  app.post("/api/content-orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { orderType, title, description, specifications, creditCost, priority, dueDate, clientNotes } = req.body;
      
      if (!orderType || !title || !description || !creditCost) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const order = await storage.createContentOrder({
        clientId: user.id,
        orderType,
        title,
        description,
        specifications,
        creditCost: Math.round(creditCost * 100), // Convert to cents
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        clientNotes,
      });
      
      res.status(201).json(order);
    } catch (error: any) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: error.message || "Failed to create order" });
    }
  });

  // Update a content order (owner for drafts, admin for others)
  app.patch("/api/content-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      
      const order = await storage.getContentOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Only owner can edit drafts, admin can edit anything
      if (user.role !== "admin" && (order.clientId !== user.id || order.status !== "draft")) {
        return res.status(403).json({ error: "Cannot edit this order" });
      }
      
      const updates = req.body;
      if (updates.creditCost) {
        updates.creditCost = Math.round(updates.creditCost * 100);
      }
      if (updates.dueDate) {
        updates.dueDate = new Date(updates.dueDate);
      }
      
      const updated = await storage.updateContentOrder(id, updates);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: error.message || "Failed to update order" });
    }
  });

  // Submit a content order (spend credits)
  app.post("/api/content-orders/:id/submit", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      
      const submitted = await storage.submitContentOrder(id, user.id);
      if (!submitted) {
        return res.status(400).json({ error: "Cannot submit this order" });
      }
      
      res.json(submitted);
    } catch (error: any) {
      console.error("Error submitting order:", error);
      res.status(500).json({ error: error.message || "Failed to submit order" });
    }
  });

  // Assign a content order to a team member (admin only)
  app.post("/api/content-orders/:id/assign", requireRole("admin"), async (req, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const { assignedTo } = req.body;
      
      if (!assignedTo) {
        return res.status(400).json({ error: "assignedTo is required" });
      }
      
      const assigned = await storage.assignContentOrder(id, assignedTo, user.id);
      if (!assigned) {
        return res.status(400).json({ error: "Cannot assign this order" });
      }
      
      res.json(assigned);
    } catch (error: any) {
      console.error("Error assigning order:", error);
      res.status(500).json({ error: error.message || "Failed to assign order" });
    }
  });

  // Complete a content order (admin or assigned team member)
  app.post("/api/content-orders/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const { deliverableUrl } = req.body;
      
      const order = await storage.getContentOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Only admin or assigned team member can complete
      if (user.role !== "admin" && order.assignedTo !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!deliverableUrl) {
        return res.status(400).json({ error: "deliverableUrl is required" });
      }
      
      const completed = await storage.completeContentOrder(id, deliverableUrl, user.id);
      if (!completed) {
        return res.status(400).json({ error: "Cannot complete this order" });
      }
      
      res.json(completed);
    } catch (error: any) {
      console.error("Error completing order:", error);
      res.status(500).json({ error: error.message || "Failed to complete order" });
    }
  });

  // Cancel a content order (owner only for draft/submitted)
  app.post("/api/content-orders/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      
      const cancelled = await storage.cancelContentOrder(id, user.id);
      if (!cancelled) {
        return res.status(400).json({ error: "Cannot cancel this order" });
      }
      
      res.json(cancelled);
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      res.status(500).json({ error: error.message || "Failed to cancel order" });
    }
  });

  // ==================== CLIENT WORK LIBRARY ROUTES ====================

  // Get client's completed deliverables (work library)
  app.get("/api/client/work-library", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Get completed orders for this client with deliverables
      const orders = await storage.getContentOrders(user.id);
      const completedOrders = orders.filter(o => o.status === "completed" && o.deliverableUrl);
      
      // Group by order type for easy categorization
      const library = completedOrders.map(order => ({
        id: order.id,
        title: order.title,
        orderType: order.orderType,
        deliverableUrl: order.deliverableUrl,
        completedAt: order.completedAt,
        createdAt: order.createdAt,
        description: order.description,
        specifications: order.specifications,
      }));
      
      res.json(library);
    } catch (error) {
      console.error("Error fetching work library:", error);
      res.status(500).json({ error: "Failed to fetch work library" });
    }
  });

  // Get client's order progress/timeline for visibility with worker info and presence
  app.get("/api/client/order-progress/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const orderId = parseInt(req.params.id);
      
      const order = await storage.getContentOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Only the client who owns the order can see details
      if (order.clientId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get related task if exists
      let taskInfo = null;
      let assignedWorker = null;
      let workerPresence = null;
      
      if (order.relatedTaskId) {
        const task = await storage.getContentTask(order.relatedTaskId);
        if (task) {
          taskInfo = {
            id: task.id,
            status: task.status,
            assignedTo: task.assignedTo || null,
            dueDate: task.dueDate,
            estimatedHours: task.estimatedHours || null,
            createdAt: task.createdAt,
          };
          
          // Get assigned worker info (show limited, privacy-respecting info)
          if (task.assignedTo) {
            const worker = await storage.getUser(task.assignedTo);
            if (worker) {
              assignedWorker = {
                id: worker.id,
                firstName: worker.firstName,
                lastName: worker.lastName?.charAt(0), // Only show first letter of last name
              };
              
              // Check for Discord presence (screen sharing indicates active work)
              try {
                const members = await storage.getDirectoryMembers();
                const member = members.find((m: any) => m.userId === task.assignedTo);
                if (member?.discordUserId) {
                  const discordSettings = await storage.getTeamIntegrationSettings();
                  if (discordSettings?.discordBotToken && discordSettings?.discordGuildId) {
                    const discordActivity = (global as any).discordPresence?.get(member.discordUserId);
                    if (discordActivity?.isScreenSharing) {
                      workerPresence = {
                        isActive: true,
                        status: "Currently working (screen sharing)",
                      };
                    }
                  }
                }
              } catch (err) {
                // Ignore presence errors - not critical
              }
            }
          }
        }
      }
      
      // Calculate estimated delivery if task has due date
      let estimatedDelivery = null;
      if (taskInfo?.dueDate) {
        estimatedDelivery = taskInfo.dueDate;
      } else if (order.submittedAt && order.status !== "completed") {
        // Fallback: estimate based on order type (simplified SLA estimates in days)
        const slaEstimates: Record<string, number> = {
          social_post: 2,
          blog_article: 5,
          video: 7,
          graphic_design: 3,
          email_campaign: 3,
          web_copy: 5,
          other: 5,
        };
        const days = slaEstimates[order.orderType] || 5;
        const estimated = new Date(order.submittedAt);
        estimated.setDate(estimated.getDate() + days);
        estimatedDelivery = estimated;
      }
      
      // Build timeline/progress
      const progress = {
        order: {
          id: order.id,
          title: order.title,
          status: order.status,
          createdAt: order.createdAt,
          submittedAt: order.submittedAt,
          completedAt: order.completedAt,
          priority: order.priority,
          deliverableUrl: order.deliverableUrl,
        },
        task: taskInfo,
        assignedWorker,
        workerPresence,
        estimatedDelivery,
        timeline: [] as { date: Date | null; event: string; status: string }[],
      };
      
      // Build timeline events
      if (order.createdAt) {
        progress.timeline.push({ date: order.createdAt, event: "Order created", status: "completed" });
      }
      if (order.submittedAt) {
        progress.timeline.push({ date: order.submittedAt, event: "Order submitted", status: "completed" });
      }
      if (order.status === "in_progress") {
        progress.timeline.push({ date: null, event: "Work in progress", status: "current" });
      }
      if (order.status === "review") {
        progress.timeline.push({ date: null, event: "Under review", status: "current" });
      }
      if (order.completedAt) {
        progress.timeline.push({ date: order.completedAt, event: "Completed", status: "completed" });
      }
      
      res.json(progress);
    } catch (error) {
      console.error("Error fetching order progress:", error);
      res.status(500).json({ error: "Failed to fetch order progress" });
    }
  });

  // Get client dashboard summary
  app.get("/api/client/dashboard-summary", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Get balance
      const balance = await storage.getClientCredit(user.id);
      
      // Get orders
      const orders = await storage.getContentOrders(user.id);
      
      // Get credit requests
      const requests = await storage.getCreditRequests(user.id);
      
      // Calculate stats
      const activeOrders = orders.filter((o: any) => !["completed", "cancelled"].includes(o.status));
      const completedOrders = orders.filter((o: any) => o.status === "completed");
      const pendingRequests = requests.filter((r: any) => r.status === "pending");
      
      // Calculate SLA metrics (orders that have a due date)
      const ordersWithDueDate = orders.filter((o: any) => o.dueDate && !["completed", "cancelled"].includes(o.status));
      const overdueOrders = ordersWithDueDate.filter((o: any) => new Date(o.dueDate!) < new Date());
      
      // Calculate average completion time (for completed orders)
      let avgCompletionDays = 0;
      if (completedOrders.length > 0) {
        const totalDays = completedOrders.reduce((sum: number, order: any) => {
          if (order.submittedAt && order.completedAt) {
            const submitted = new Date(order.submittedAt);
            const completed = new Date(order.completedAt);
            return sum + (completed.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24);
          }
          return sum;
        }, 0);
        avgCompletionDays = Math.round(totalDays / completedOrders.length);
      }
      
      res.json({
        balance: balance?.balance || 0,
        currency: balance?.currency || "USD",
        stats: {
          activeOrders: activeOrders.length,
          completedOrders: completedOrders.length,
          totalOrders: orders.length,
          pendingRequests: pendingRequests.length,
          overdueOrders: overdueOrders.length,
          avgCompletionDays,
        },
        recentOrders: orders.slice(0, 5),
        activeOrderDetails: activeOrders.map(o => ({
          id: o.id,
          title: o.title,
          status: o.status,
          priority: o.priority,
          createdAt: o.createdAt,
          dueDate: o.dueDate,
          orderType: o.orderType,
        })),
      });
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
  });

  // ==================== ORDER TEMPLATES & SAVED ORDERS ====================

  // Get order templates (client can see active ones only)
  app.get("/api/order-templates", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const activeOnly = user.role !== "admin";
      const templates = await storage.getOrderTemplates(activeOnly);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching order templates:", error);
      res.status(500).json({ error: "Failed to fetch order templates" });
    }
  });

  // Get single order template
  app.get("/api/order-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const template = await storage.getOrderTemplate(parseInt(req.params.id));
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching order template:", error);
      res.status(500).json({ error: "Failed to fetch order template" });
    }
  });

  // Create order template (admin only)
  app.post("/api/order-templates", requireRole("admin"), async (req: any, res) => {
    try {
      const user = req.user;
      const template = await storage.createOrderTemplate({
        ...req.body,
        createdBy: user.id,
      });
      res.json(template);
    } catch (error) {
      console.error("Error creating order template:", error);
      res.status(500).json({ error: "Failed to create order template" });
    }
  });

  // Update order template (admin only)
  app.patch("/api/order-templates/:id", requireRole("admin"), async (req, res) => {
    try {
      const updated = await storage.updateOrderTemplate(parseInt(req.params.id), req.body);
      if (!updated) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating order template:", error);
      res.status(500).json({ error: "Failed to update order template" });
    }
  });

  // Delete order template (admin only)
  app.delete("/api/order-templates/:id", requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteOrderTemplate(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting order template:", error);
      res.status(500).json({ error: "Failed to delete order template" });
    }
  });

  // Get saved orders for current user
  app.get("/api/saved-orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const savedOrders = await storage.getSavedOrders(user.id);
      res.json(savedOrders);
    } catch (error) {
      console.error("Error fetching saved orders:", error);
      res.status(500).json({ error: "Failed to fetch saved orders" });
    }
  });

  // Get single saved order
  app.get("/api/saved-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const savedOrder = await storage.getSavedOrder(parseInt(req.params.id));
      if (!savedOrder) {
        return res.status(404).json({ error: "Saved order not found" });
      }
      // Ensure user owns this saved order
      if (savedOrder.clientId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(savedOrder);
    } catch (error) {
      console.error("Error fetching saved order:", error);
      res.status(500).json({ error: "Failed to fetch saved order" });
    }
  });

  // Create saved order
  app.post("/api/saved-orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const savedOrder = await storage.createSavedOrder({
        ...req.body,
        clientId: user.id,
      });
      res.json(savedOrder);
    } catch (error) {
      console.error("Error creating saved order:", error);
      res.status(500).json({ error: "Failed to create saved order" });
    }
  });

  // Update saved order
  app.patch("/api/saved-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const savedOrder = await storage.getSavedOrder(parseInt(req.params.id));
      if (!savedOrder) {
        return res.status(404).json({ error: "Saved order not found" });
      }
      if (savedOrder.clientId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updated = await storage.updateSavedOrder(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating saved order:", error);
      res.status(500).json({ error: "Failed to update saved order" });
    }
  });

  // Delete saved order
  app.delete("/api/saved-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const savedOrder = await storage.getSavedOrder(parseInt(req.params.id));
      if (!savedOrder) {
        return res.status(404).json({ error: "Saved order not found" });
      }
      if (savedOrder.clientId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteSavedOrder(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting saved order:", error);
      res.status(500).json({ error: "Failed to delete saved order" });
    }
  });

  // Use saved order (increment usage and create order from it)
  app.post("/api/saved-orders/:id/use", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const savedOrder = await storage.getSavedOrder(parseInt(req.params.id));
      if (!savedOrder) {
        return res.status(404).json({ error: "Saved order not found" });
      }
      if (savedOrder.clientId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Increment usage
      await storage.incrementSavedOrderUsage(savedOrder.id);
      
      // Create a new content order based on saved order
      const newOrder = await storage.createContentOrder({
        clientId: user.id,
        orderType: savedOrder.orderType,
        title: savedOrder.title || "",
        description: savedOrder.description || "",
        specifications: savedOrder.specifications || null,
        creditCost: savedOrder.creditCost || 0,
        priority: savedOrder.priority || "normal",
        clientNotes: savedOrder.clientNotes || null,
        dueDate: null,
      });
      
      res.json(newOrder);
    } catch (error) {
      console.error("Error using saved order:", error);
      res.status(500).json({ error: "Failed to create order from saved template" });
    }
  });

  // ==================== CLIENT ONBOARDING ROUTES ====================

  // Get client onboarding status
  app.get("/api/client-onboarding", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      let onboarding = await storage.getClientOnboarding(user.id);
      
      // Create onboarding record if doesn't exist
      if (!onboarding) {
        onboarding = await storage.createClientOnboarding({
          userId: user.id,
          hasSeenWelcome: false,
          hasViewedCredits: false,
          hasPlacedFirstOrder: false,
          hasViewedBrandPacks: false,
          hasViewedTransactionHistory: false,
        });
      }
      
      res.json(onboarding);
    } catch (error) {
      console.error("Error fetching client onboarding:", error);
      res.status(500).json({ error: "Failed to fetch onboarding status" });
    }
  });

  // Mark an onboarding step as complete
  app.post("/api/client-onboarding/mark-step", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { step } = req.body;
      
      const validSteps = ["hasSeenWelcome", "hasViewedCredits", "hasPlacedFirstOrder", "hasViewedBrandPacks", "hasViewedTransactionHistory"];
      if (!validSteps.includes(step)) {
        return res.status(400).json({ error: "Invalid onboarding step" });
      }
      
      const updated = await storage.markClientOnboardingStep(user.id, step as any);
      res.json(updated);
    } catch (error: any) {
      console.error("Error marking onboarding step:", error);
      res.status(500).json({ error: error.message || "Failed to mark step" });
    }
  });

  // ==================== WEB3 ONBOARDING ROUTES ====================

  // Get web3 onboarding status
  app.get("/api/web3-onboarding", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      let onboarding = await storage.getWeb3Onboarding(user.id);
      
      // Create onboarding record if doesn't exist
      if (!onboarding) {
        onboarding = await storage.createWeb3Onboarding({
          userId: user.id,
          hasSeenWelcome: false,
          hasComparedAddresses: false,
          hasExtractedAddresses: false,
          hasCreatedCollection: false,
          hasViewedHistory: false,
          hasUsedMerge: false,
        });
      }
      
      res.json(onboarding);
    } catch (error) {
      console.error("Error fetching web3 onboarding:", error);
      res.status(500).json({ error: "Failed to fetch onboarding status" });
    }
  });

  // Mark a web3 onboarding step as complete
  app.post("/api/web3-onboarding/mark-step", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { step } = req.body;
      
      const validSteps = ["hasSeenWelcome", "hasComparedAddresses", "hasExtractedAddresses", "hasCreatedCollection", "hasViewedHistory", "hasUsedMerge"];
      if (!validSteps.includes(step)) {
        return res.status(400).json({ error: "Invalid onboarding step" });
      }
      
      const updated = await storage.markWeb3OnboardingStep(user.id, step as any);
      res.json(updated);
    } catch (error: any) {
      console.error("Error marking web3 onboarding step:", error);
      res.status(500).json({ error: error.message || "Failed to mark step" });
    }
  });

  // ==================== DELIVERABLE ANNOTATIONS ROUTES ====================

  // Get annotations for a deliverable
  app.get("/api/deliverables/:id/annotations", requireRole("content"), async (req, res) => {
    try {
      const deliverableId = parseInt(req.params.id);
      const versionId = req.query.versionId ? parseInt(req.query.versionId as string) : undefined;
      const annotations = await storage.getDeliverableAnnotations(deliverableId, versionId);
      res.json(annotations);
    } catch (error) {
      console.error("Error fetching annotations:", error);
      res.status(500).json({ error: "Failed to fetch annotations" });
    }
  });

  // Create a new annotation
  app.post("/api/deliverables/:id/annotations", requireRole("content"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const deliverableId = parseInt(req.params.id);
      const { content, annotationType, versionId, positionX, positionY } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Annotation content is required" });
      }
      
      const annotation = await storage.createDeliverableAnnotation({
        deliverableId,
        versionId: versionId || null,
        userId: user.id,
        content: content.trim(),
        annotationType: annotationType || "comment",
        status: "open",
        positionX: positionX || null,
        positionY: positionY || null,
        resolvedBy: null,
      });
      
      // Create notification for task assignee if this is a revision request
      if (annotationType === "revision_request") {
        const deliverable = await storage.getDeliverable(deliverableId);
        if (deliverable?.taskId) {
          const task = await storage.getContentTask(deliverable.taskId);
          if (task?.assignedTo && task.assignedTo !== user.id) {
            await storage.createNotification({
              userId: task.assignedTo,
              type: "revision_request",
              title: "Revision Requested",
              message: `A revision was requested on ${deliverable.fileName}: "${content.substring(0, 50)}..."`,
              taskId: deliverable.taskId,
              read: false,
            });
          }
        }
      }
      
      res.json(annotation);
    } catch (error) {
      console.error("Error creating annotation:", error);
      res.status(500).json({ error: "Failed to create annotation" });
    }
  });

  // Update an annotation
  app.patch("/api/annotations/:id", requireRole("content"), async (req, res) => {
    try {
      const annotationId = parseInt(req.params.id);
      const { content, status } = req.body;
      
      const updated = await storage.updateDeliverableAnnotation(annotationId, {
        ...(content && { content: content.trim() }),
        ...(status && { status }),
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Annotation not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating annotation:", error);
      res.status(500).json({ error: "Failed to update annotation" });
    }
  });

  // Resolve an annotation
  app.post("/api/annotations/:id/resolve", requireRole("content"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const annotationId = parseInt(req.params.id);
      
      const updated = await storage.resolveDeliverableAnnotation(annotationId, user.id);
      
      if (!updated) {
        return res.status(404).json({ error: "Annotation not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error resolving annotation:", error);
      res.status(500).json({ error: "Failed to resolve annotation" });
    }
  });

  // Delete an annotation
  app.delete("/api/annotations/:id", requireRole("content"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const annotationId = parseInt(req.params.id);
      
      // Check if user owns the annotation or is admin
      const annotation = await storage.getDeliverableAnnotation(annotationId);
      if (!annotation) {
        return res.status(404).json({ error: "Annotation not found" });
      }
      
      if (annotation.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to delete this annotation" });
      }
      
      await storage.deleteDeliverableAnnotation(annotationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting annotation:", error);
      res.status(500).json({ error: "Failed to delete annotation" });
    }
  });

  // ==================== TASK MESSAGES ROUTES (Client-Team Communication) ====================

  // Get messages for an order
  app.get("/api/orders/:orderId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const orderId = parseInt(req.params.orderId);
      
      // Get the order to verify access
      const order = await storage.getContentOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Determine if user should see internal messages
      const isTeamMember = user.role === "content" || user.role === "admin";
      const isClient = order.clientId === user.id;
      
      if (!isTeamMember && !isClient) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const messages = await storage.getTaskMessages(undefined, orderId, isTeamMember);
      
      // Mark messages as read based on role
      if (isClient) {
        await storage.markAllMessagesReadByClient(orderId);
      } else {
        await storage.markAllMessagesReadByTeam(orderId);
      }
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching order messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a message on an order
  app.post("/api/orders/:orderId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const orderId = parseInt(req.params.orderId);
      const { content, isInternal, attachmentUrl, attachmentName } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Message content is required" });
      }
      
      // Get the order to verify access
      const order = await storage.getContentOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const isTeamMember = user.role === "content" || user.role === "admin";
      const isClient = order.clientId === user.id;
      
      if (!isTeamMember && !isClient) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Clients cannot send internal messages
      const messageIsInternal = isClient ? false : !!isInternal;
      
      const message = await storage.createTaskMessage({
        orderId,
        senderId: user.id,
        senderRole: user.role as any,
        content: content.trim(),
        isInternal: messageIsInternal,
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        readByClient: isClient, // If client sent it, they've read it
        readByTeam: isTeamMember, // If team sent it, they've read it
      });
      
      // Create notification for the other party
      if (isClient && order.assignedTo) {
        // Notify the assigned team member
        await storage.createNotification({
          userId: order.assignedTo,
          type: "order_message",
          title: "New Client Message",
          message: `Client sent a message on order #${orderId}: "${content.substring(0, 50)}..."`,
          taskId: order.linkedTaskId || null,
          read: false,
        });
      } else if (isTeamMember && !messageIsInternal) {
        // Notify the client
        await storage.createNotification({
          userId: order.clientId,
          type: "order_message",
          title: "Team Response",
          message: `Team replied on your order #${orderId}: "${content.substring(0, 50)}..."`,
          taskId: order.linkedTaskId || null,
          read: false,
        });
      }
      
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get unread message count for an order
  app.get("/api/orders/:orderId/messages/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const orderId = parseInt(req.params.orderId);
      
      // Get the order to verify access
      const order = await storage.getContentOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const isTeamMember = user.role === "content" || user.role === "admin";
      const isClient = order.clientId === user.id;
      
      if (!isTeamMember && !isClient) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const count = isClient 
        ? await storage.getUnreadClientMessageCount(orderId)
        : await storage.getUnreadTeamMessageCount(orderId);
      
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // ==================== CLIENT PROFILE ROUTES ====================

  // Get all client profiles - accessible to all authenticated team members
  app.get("/api/client-profiles", isAuthenticated, async (req: any, res) => {
    try {
      const profiles = await storage.getClientProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching client profiles:", error);
      res.status(500).json({ error: "Failed to fetch client profiles" });
    }
  });

  // Search client profiles
  app.get("/api/client-profiles/search", isAuthenticated, async (req: any, res) => {
    try {
      const query = req.query.q as string || "";
      const profiles = await storage.searchClientProfiles(query);
      res.json(profiles);
    } catch (error) {
      console.error("Error searching client profiles:", error);
      res.status(500).json({ error: "Failed to search client profiles" });
    }
  });

  // Get a single client profile
  app.get("/api/client-profiles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const profile = await storage.getClientProfile(id);
      if (!profile) {
        return res.status(404).json({ error: "Client profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching client profile:", error);
      res.status(500).json({ error: "Failed to fetch client profile" });
    }
  });

  // Get client profile by slug
  app.get("/api/client-profiles/slug/:slug", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await storage.getClientProfileBySlug(req.params.slug);
      if (!profile) {
        return res.status(404).json({ error: "Client profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching client profile:", error);
      res.status(500).json({ error: "Failed to fetch client profile" });
    }
  });

  // Create client profile - content/admin only
  app.post("/api/client-profiles", requireRole("content"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const profile = await storage.createClientProfile({
        ...req.body,
        createdBy: user.id,
      });
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating client profile:", error);
      res.status(500).json({ error: "Failed to create client profile" });
    }
  });

  // Update client profile - content/admin only
  app.patch("/api/client-profiles/:id", requireRole("content"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const profile = await storage.updateClientProfile(id, req.body);
      if (!profile) {
        return res.status(404).json({ error: "Client profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error updating client profile:", error);
      res.status(500).json({ error: "Failed to update client profile" });
    }
  });

  // Delete client profile - admin only
  app.delete("/api/client-profiles/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteClientProfile(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting client profile:", error);
      res.status(500).json({ error: "Failed to delete client profile" });
    }
  });

  // Get tasks/orders linked to a client profile
  app.get("/api/client-profiles/:id/links", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const links = await storage.getClientTaskLinks(id);
      res.json(links);
    } catch (error) {
      console.error("Error fetching client links:", error);
      res.status(500).json({ error: "Failed to fetch client links" });
    }
  });

  // Link a task or order to a client profile
  app.post("/api/client-profiles/:id/links", requireRole("content"), async (req: any, res) => {
    try {
      const clientProfileId = parseInt(req.params.id);
      const { taskId, orderId } = req.body;
      const link = await storage.linkTaskToClient(clientProfileId, taskId, orderId);
      res.status(201).json(link);
    } catch (error) {
      console.error("Error linking to client:", error);
      res.status(500).json({ error: "Failed to link to client" });
    }
  });

  // Unlink from client profile
  app.delete("/api/client-links/:id", requireRole("content"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.unlinkTaskFromClient(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error unlinking from client:", error);
      res.status(500).json({ error: "Failed to unlink from client" });
    }
  });

  // ==================== CLIENT CALENDAR ROUTES ====================

  // Get all calendar events (optionally filtered by date range)
  app.get("/api/calendar-events", isAuthenticated, async (req: any, res) => {
    try {
      const startDate = req.query.start ? new Date(req.query.start) : undefined;
      const endDate = req.query.end ? new Date(req.query.end) : undefined;
      const events = await storage.getAllCalendarEvents(startDate, endDate);
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  // Get calendar events for a specific client
  app.get("/api/client-profiles/:id/calendar", isAuthenticated, async (req: any, res) => {
    try {
      const clientProfileId = parseInt(req.params.id);
      const events = await storage.getClientCalendarEvents(clientProfileId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching client calendar events:", error);
      res.status(500).json({ error: "Failed to fetch client calendar events" });
    }
  });

  // Get a single calendar event
  app.get("/api/calendar-events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getClientCalendarEvent(id);
      if (!event) {
        return res.status(404).json({ error: "Calendar event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching calendar event:", error);
      res.status(500).json({ error: "Failed to fetch calendar event" });
    }
  });

  // Create calendar event - content/admin only
  app.post("/api/calendar-events", requireRole("content"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const event = await storage.createClientCalendarEvent({
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
        createdBy: user.id,
      });
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });

  // Update calendar event - content/admin only
  app.patch("/api/calendar-events/:id", requireRole("content"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = { ...req.body };
      if (updates.startDate) updates.startDate = new Date(updates.startDate);
      if (updates.endDate) updates.endDate = new Date(updates.endDate);
      
      const event = await storage.updateClientCalendarEvent(id, updates);
      if (!event) {
        return res.status(404).json({ error: "Calendar event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(500).json({ error: "Failed to update calendar event" });
    }
  });

  // Delete calendar event - content/admin only
  app.delete("/api/calendar-events/:id", requireRole("content"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteClientCalendarEvent(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  });

  // ==================== INTERNAL TEAM MEMBER ROUTES ====================

  // Get all internal team members - admin only
  app.get("/api/internal-team", requireRole("admin"), async (req: any, res) => {
    try {
      const members = await storage.getInternalTeamMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching internal team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Get single internal team member - admin only
  app.get("/api/internal-team/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const member = await storage.getInternalTeamMember(id);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error fetching team member:", error);
      res.status(500).json({ error: "Failed to fetch team member" });
    }
  });

  // Search internal team members - admin only
  app.get("/api/internal-team/search/:query", requireRole("admin"), async (req: any, res) => {
    try {
      const query = req.params.query;
      const members = await storage.searchInternalTeamMembers(query);
      res.json(members);
    } catch (error) {
      console.error("Error searching team members:", error);
      res.status(500).json({ error: "Failed to search team members" });
    }
  });

  // Get team members by department - admin only
  app.get("/api/internal-team/department/:dept", requireRole("admin"), async (req: any, res) => {
    try {
      const department = req.params.dept;
      const members = await storage.getTeamMembersByDepartment(department);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members by department:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Create internal team member - admin only
  app.post("/api/internal-team", requireRole("admin"), async (req: any, res) => {
    try {
      const validationResult = insertInternalTeamMemberSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      const member = await storage.createInternalTeamMember(validationResult.data);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error creating team member:", error);
      res.status(500).json({ error: "Failed to create team member" });
    }
  });

  // Update internal team member - admin only
  app.patch("/api/internal-team/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const validationResult = insertInternalTeamMemberSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      const member = await storage.updateInternalTeamMember(id, validationResult.data);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  // Delete internal team member - admin only
  app.delete("/api/internal-team/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteInternalTeamMember(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  // ==================== TEAM PAYMENT HISTORY ROUTES ====================

  // Get payment history for a member - admin only
  app.get("/api/internal-team/:id/payments", requireRole("admin"), async (req: any, res) => {
    try {
      const memberId = parseInt(req.params.id);
      const payments = await storage.getTeamPaymentHistory(memberId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ error: "Failed to fetch payment history" });
    }
  });

  // Get all team payments - admin only
  app.get("/api/team-payments", requireRole("admin"), async (req: any, res) => {
    try {
      const startDate = req.query.start ? new Date(req.query.start) : undefined;
      const endDate = req.query.end ? new Date(req.query.end) : undefined;
      const payments = await storage.getAllTeamPayments(startDate, endDate);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching team payments:", error);
      res.status(500).json({ error: "Failed to fetch team payments" });
    }
  });

  // Create team payment - admin only
  app.post("/api/team-payments", requireRole("admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const paymentData = {
        ...req.body,
        processedBy: user.id,
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
        periodStart: req.body.periodStart ? new Date(req.body.periodStart) : null,
        periodEnd: req.body.periodEnd ? new Date(req.body.periodEnd) : null,
      };
      const validationResult = insertTeamPaymentHistorySchema.safeParse(paymentData);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      const payment = await storage.createTeamPayment(validationResult.data);
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating team payment:", error);
      res.status(500).json({ error: "Failed to create team payment" });
    }
  });

  // Update team payment - admin only
  app.patch("/api/team-payments/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = { ...req.body };
      if (updates.paymentDate) updates.paymentDate = new Date(updates.paymentDate);
      if (updates.periodStart) updates.periodStart = new Date(updates.periodStart);
      if (updates.periodEnd) updates.periodEnd = new Date(updates.periodEnd);
      
      const validationResult = insertTeamPaymentHistorySchema.partial().safeParse(updates);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      const payment = await storage.updateTeamPayment(id, validationResult.data);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      console.error("Error updating team payment:", error);
      res.status(500).json({ error: "Failed to update team payment" });
    }
  });

  // Delete team payment - admin only
  app.delete("/api/team-payments/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTeamPayment(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting team payment:", error);
      res.status(500).json({ error: "Failed to delete team payment" });
    }
  });

  // ==================== TEAM STRUCTURE ROUTES ====================

  // Get team hierarchy (all members with supervisor info) - admin only
  app.get("/api/team-structure/hierarchy", requireRole("admin"), async (req: any, res) => {
    try {
      const members = await storage.getTeamHierarchy();
      res.json(members);
    } catch (error) {
      console.error("Error fetching team hierarchy:", error);
      res.status(500).json({ error: "Failed to fetch team hierarchy" });
    }
  });

  // Get direct reports for a supervisor - admin only
  app.get("/api/team-structure/reports/:supervisorId", requireRole("admin"), async (req: any, res) => {
    try {
      const supervisorId = parseInt(req.params.supervisorId);
      const members = await storage.getTeamMembersBySupervisor(supervisorId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching direct reports:", error);
      res.status(500).json({ error: "Failed to fetch direct reports" });
    }
  });

  // Get team members by employment type - admin only
  app.get("/api/team-structure/type/:type", requireRole("admin"), async (req: any, res) => {
    try {
      const employmentType = req.params.type;
      const members = await storage.getTeamMembersByEmploymentType(employmentType);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members by employment type:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // ==================== TEAM MEMBER CLIENT ASSIGNMENTS ROUTES ====================

  // Get client assignments for a team member - admin only
  app.get("/api/team-structure/assignments/:memberId", requireRole("admin"), async (req: any, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const assignments = await storage.getTeamMemberClientAssignments(memberId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching client assignments:", error);
      res.status(500).json({ error: "Failed to fetch client assignments" });
    }
  });

  // Get all assignments for a client profile - admin only
  app.get("/api/team-structure/client-profile/:clientProfileId/assignees", requireRole("admin"), async (req: any, res) => {
    try {
      const clientProfileId = parseInt(req.params.clientProfileId);
      const assignees = await storage.getClientProfileAssignees(clientProfileId);
      res.json(assignees);
    } catch (error) {
      console.error("Error fetching client profile assignees:", error);
      res.status(500).json({ error: "Failed to fetch assignees" });
    }
  });

  // Get all assignments for a client user - admin only
  app.get("/api/team-structure/client-user/:clientUserId/assignees", requireRole("admin"), async (req: any, res) => {
    try {
      const clientUserId = req.params.clientUserId;
      const assignees = await storage.getClientUserAssignees(clientUserId);
      res.json(assignees);
    } catch (error) {
      console.error("Error fetching client user assignees:", error);
      res.status(500).json({ error: "Failed to fetch assignees" });
    }
  });

  // Create client assignment - admin only
  app.post("/api/team-structure/assignments", requireRole("admin"), async (req: any, res) => {
    try {
      const assignment = await storage.createTeamMemberClientAssignment(req.body);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating client assignment:", error);
      res.status(500).json({ error: "Failed to create client assignment" });
    }
  });

  // Update client assignment - admin only
  app.patch("/api/team-structure/assignments/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.updateTeamMemberClientAssignment(id, req.body);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error updating client assignment:", error);
      res.status(500).json({ error: "Failed to update client assignment" });
    }
  });

  // Delete client assignment - admin only
  app.delete("/api/team-structure/assignments/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTeamMemberClientAssignment(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting client assignment:", error);
      res.status(500).json({ error: "Failed to delete client assignment" });
    }
  });

  // ==================== TEAM STRUCTURE TEMPLATES ROUTES ====================

  // Get all team structure templates - admin only
  app.get("/api/team-structure-templates", requireRole("admin"), async (req: any, res) => {
    try {
      const templates = await storage.getTeamStructureTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching team structure templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Get default template - admin only
  app.get("/api/team-structure-templates/default", requireRole("admin"), async (req: any, res) => {
    try {
      const template = await storage.getDefaultTeamStructureTemplate();
      res.json(template || null);
    } catch (error) {
      console.error("Error fetching default template:", error);
      res.status(500).json({ error: "Failed to fetch default template" });
    }
  });

  // Get single template - admin only
  app.get("/api/team-structure-templates/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getTeamStructureTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  // Save current team structure as template - admin only
  app.post("/api/team-structure-templates", requireRole("admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const { name, description, isDefault } = req.body;
      
      // Get all current team members
      const teamMembers = await storage.getInternalTeamMembers();
      
      const templateData = {
        name: name || `Team Template - ${new Date().toLocaleDateString()}`,
        description: description || "Team structure snapshot",
        teamData: teamMembers,
        createdBy: user.id,
        isDefault: isDefault || false,
      };
      
      const template = await storage.createTeamStructureTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error saving team structure template:", error);
      res.status(500).json({ error: "Failed to save template" });
    }
  });

  // Update template - admin only
  app.patch("/api/team-structure-templates/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.updateTeamStructureTemplate(id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // Set template as default - admin only
  app.post("/api/team-structure-templates/:id/set-default", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.setDefaultTeamStructureTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error setting default template:", error);
      res.status(500).json({ error: "Failed to set default template" });
    }
  });

  // Load template into database - admin only
  app.post("/api/team-structure-templates/:id/load", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const members = await storage.loadTeamStructureTemplate(id);
      res.json({ success: true, members, message: "Template loaded successfully" });
    } catch (error) {
      console.error("Error loading template:", error);
      res.status(500).json({ error: "Failed to load template" });
    }
  });

  // Delete template - admin only
  app.delete("/api/team-structure-templates/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTeamStructureTemplate(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // ==================== CONTENT IDEAS (PRE-PRODUCTION APPROVAL) ROUTES ====================

  // Get all content ideas - content/admin only
  app.get("/api/content-ideas", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      if (user.role === "content" || user.role === "admin") {
        const ideas = await storage.getContentIdeas();
        res.json(ideas);
      } else {
        // Clients only see their own ideas
        const ideas = await storage.getContentIdeasForClient(user.id);
        res.json(ideas);
      }
    } catch (error) {
      console.error("Error fetching content ideas:", error);
      res.status(500).json({ error: "Failed to fetch content ideas" });
    }
  });

  // Get pending ideas for current client
  app.get("/api/content-ideas/pending", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const ideas = await storage.getPendingIdeasForClient(user.id);
      res.json(ideas);
    } catch (error) {
      console.error("Error fetching pending ideas:", error);
      res.status(500).json({ error: "Failed to fetch pending ideas" });
    }
  });

  // Get ideas by status - content/admin only
  app.get("/api/content-ideas/status/:status", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const status = req.params.status;
      const ideas = await storage.getContentIdeasByStatus(status);
      res.json(ideas);
    } catch (error) {
      console.error("Error fetching ideas by status:", error);
      res.status(500).json({ error: "Failed to fetch ideas" });
    }
  });

  // Get single content idea
  app.get("/api/content-ideas/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const idea = await storage.getContentIdea(id);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }
      const user = req.user as User;
      // Only allow access if user is content/admin or the client
      if (user.role !== "content" && user.role !== "admin" && idea.clientId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(idea);
    } catch (error) {
      console.error("Error fetching content idea:", error);
      res.status(500).json({ error: "Failed to fetch idea" });
    }
  });

  // Create content idea - content/admin only
  app.post("/api/content-ideas", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const idea = await storage.createContentIdea({
        ...req.body,
        createdBy: user.id,
      });
      res.status(201).json(idea);
    } catch (error) {
      console.error("Error creating content idea:", error);
      res.status(500).json({ error: "Failed to create idea" });
    }
  });

  // Update content idea - content/admin only
  app.patch("/api/content-ideas/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const idea = await storage.updateContentIdea(id, req.body);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }
      res.json(idea);
    } catch (error) {
      console.error("Error updating content idea:", error);
      res.status(500).json({ error: "Failed to update idea" });
    }
  });

  // Delete content idea - content/admin only
  app.delete("/api/content-ideas/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContentIdea(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting content idea:", error);
      res.status(500).json({ error: "Failed to delete idea" });
    }
  });

  // Approve content idea - client only (for their own ideas)
  app.post("/api/content-ideas/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user as User;
      
      // Get the idea first
      const existingIdea = await storage.getContentIdea(id);
      if (!existingIdea) {
        return res.status(404).json({ error: "Idea not found" });
      }
      
      // Only allow the client to approve their own ideas
      if (existingIdea.clientId !== user.id) {
        return res.status(403).json({ error: "You can only approve ideas assigned to you" });
      }
      
      const idea = await storage.approveContentIdea(id, user.id, req.body.clientNotes);
      res.json(idea);
    } catch (error) {
      console.error("Error approving content idea:", error);
      res.status(500).json({ error: "Failed to approve idea" });
    }
  });

  // Deny content idea - client only (for their own ideas)
  app.post("/api/content-ideas/:id/deny", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user as User;
      
      // Get the idea first
      const existingIdea = await storage.getContentIdea(id);
      if (!existingIdea) {
        return res.status(404).json({ error: "Idea not found" });
      }
      
      // Only allow the client to deny their own ideas
      if (existingIdea.clientId !== user.id) {
        return res.status(403).json({ error: "You can only deny ideas assigned to you" });
      }
      
      const idea = await storage.denyContentIdea(id, user.id, req.body.clientNotes);
      res.json(idea);
    } catch (error) {
      console.error("Error denying content idea:", error);
      res.status(500).json({ error: "Failed to deny idea" });
    }
  });

  // Get ideas for a specific client - content/admin only
  app.get("/api/content-ideas/client/:clientId", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const clientId = req.params.clientId;
      const ideas = await storage.getContentIdeasForClient(clientId);
      res.json(ideas);
    } catch (error) {
      console.error("Error fetching client ideas:", error);
      res.status(500).json({ error: "Failed to fetch client ideas" });
    }
  });

  // ==================== SAVED ITEMS (PINNED CONTENT) API ====================

  // Get all saved items for current user
  app.get("/api/saved-items", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const items = await storage.getSavedItems(user.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching saved items:", error);
      res.status(500).json({ error: "Failed to fetch saved items" });
    }
  });

  // Get saved items by type
  app.get("/api/saved-items/type/:itemType", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const items = await storage.getSavedItemsByType(user.id, req.params.itemType);
      res.json(items);
    } catch (error) {
      console.error("Error fetching saved items by type:", error);
      res.status(500).json({ error: "Failed to fetch saved items" });
    }
  });

  // Check if item is saved
  app.get("/api/saved-items/check/:itemType/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const isSaved = await storage.isItemSaved(user.id, req.params.itemType, parseInt(req.params.itemId));
      res.json({ isSaved });
    } catch (error) {
      console.error("Error checking saved item:", error);
      res.status(500).json({ error: "Failed to check saved item" });
    }
  });

  // Save an item
  app.post("/api/saved-items", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { itemType, itemId, notes } = req.body;
      
      // Check if already saved
      const alreadySaved = await storage.isItemSaved(user.id, itemType, itemId);
      if (alreadySaved) {
        return res.status(400).json({ error: "Item already saved" });
      }
      
      const item = await storage.createSavedItem({
        userId: user.id,
        itemType,
        itemId,
        notes: notes || null,
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error saving item:", error);
      res.status(500).json({ error: "Failed to save item" });
    }
  });

  // Update saved item notes
  app.patch("/api/saved-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      
      const existing = await storage.getSavedItem(id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ error: "Saved item not found" });
      }
      
      const updated = await storage.updateSavedItem(id, { notes: req.body.notes });
      res.json(updated);
    } catch (error) {
      console.error("Error updating saved item:", error);
      res.status(500).json({ error: "Failed to update saved item" });
    }
  });

  // Remove saved item
  app.delete("/api/saved-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      
      const existing = await storage.getSavedItem(id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ error: "Saved item not found" });
      }
      
      await storage.deleteSavedItem(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing saved item:", error);
      res.status(500).json({ error: "Failed to remove saved item" });
    }
  });

  // Toggle save status (save or unsave)
  app.post("/api/saved-items/toggle", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { itemType, itemId, notes } = req.body;
      
      const isSaved = await storage.isItemSaved(user.id, itemType, itemId);
      if (isSaved) {
        await storage.deleteSavedItemByTarget(user.id, itemType, itemId);
        res.json({ saved: false });
      } else {
        const item = await storage.createSavedItem({
          userId: user.id,
          itemType,
          itemId,
          notes: notes || null,
        });
        res.json({ saved: true, item });
      }
    } catch (error) {
      console.error("Error toggling saved item:", error);
      res.status(500).json({ error: "Failed to toggle saved item" });
    }
  });

  // ==================== FEEDBACK SUBMISSIONS API ====================

  // Get all feedback (admin/content only)
  app.get("/api/feedback", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const { targetType, targetId } = req.query;
      const feedback = await storage.getFeedbackSubmissions(
        targetType as string | undefined,
        targetId ? parseInt(targetId as string) : undefined
      );
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // Get feedback for a specific target
  app.get("/api/feedback/:targetType/:targetId", isAuthenticated, async (req: any, res) => {
    try {
      const feedback = await storage.getFeedbackSubmissions(
        req.params.targetType,
        parseInt(req.params.targetId)
      );
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // Get feedback stats for a target
  app.get("/api/feedback/:targetType/:targetId/stats", isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getFeedbackStats(
        req.params.targetType,
        parseInt(req.params.targetId)
      );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching feedback stats:", error);
      res.status(500).json({ error: "Failed to fetch feedback stats" });
    }
  });

  // Get user's own feedback
  app.get("/api/feedback/mine", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const feedback = await storage.getFeedbackByUser(user.id);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching user feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // Submit feedback
  app.post("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { targetType, targetId, category, rating, comment, isPublic } = req.body;
      
      if (!targetType || !targetId || !category || rating === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }
      
      const feedback = await storage.createFeedbackSubmission({
        submittedBy: user.id,
        targetType,
        targetId,
        category,
        rating,
        comment: comment || null,
        isPublic: isPublic || false,
      });
      res.status(201).json(feedback);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Respond to feedback (admin/content only)
  app.post("/api/feedback/:id/respond", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const { responseText } = req.body;
      
      if (!responseText) {
        return res.status(400).json({ error: "Response text is required" });
      }
      
      const feedback = await storage.respondToFeedback(id, user.id, responseText);
      if (!feedback) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      res.json(feedback);
    } catch (error) {
      console.error("Error responding to feedback:", error);
      res.status(500).json({ error: "Failed to respond to feedback" });
    }
  });

  // Delete feedback (admin only or own feedback)
  app.delete("/api/feedback/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      
      const existing = await storage.getFeedbackSubmission(id);
      if (!existing) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      
      if (existing.submittedBy !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to delete this feedback" });
      }
      
      await storage.deleteFeedbackSubmission(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting feedback:", error);
      res.status(500).json({ error: "Failed to delete feedback" });
    }
  });

  // ==================== YOUTUBE REFERENCES API ====================

  // Get all YouTube references
  app.get("/api/youtube-references", isAuthenticated, async (req: any, res) => {
    try {
      const { targetType, targetId } = req.query;
      const references = await storage.getYoutubeReferences(
        targetType as string | undefined,
        targetId ? parseInt(targetId as string) : undefined
      );
      res.json(references);
    } catch (error) {
      console.error("Error fetching YouTube references:", error);
      res.status(500).json({ error: "Failed to fetch YouTube references" });
    }
  });

  // Get YouTube references for a specific target
  app.get("/api/youtube-references/:targetType/:targetId", isAuthenticated, async (req: any, res) => {
    try {
      const references = await storage.getYoutubeReferences(
        req.params.targetType,
        parseInt(req.params.targetId)
      );
      res.json(references);
    } catch (error) {
      console.error("Error fetching YouTube references:", error);
      res.status(500).json({ error: "Failed to fetch YouTube references" });
    }
  });

  // Get YouTube references by string target (for client slugs)
  app.get("/api/youtube-references/string/:targetType/:targetStringId", isAuthenticated, async (req: any, res) => {
    try {
      const references = await storage.getYoutubeReferencesByStringTarget(
        req.params.targetType,
        req.params.targetStringId
      );
      res.json(references);
    } catch (error) {
      console.error("Error fetching YouTube references:", error);
      res.status(500).json({ error: "Failed to fetch YouTube references" });
    }
  });

  // Add YouTube reference
  app.post("/api/youtube-references", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { targetType, targetId, targetStringId, videoUrl, title, description, thumbnailUrl, category, tags } = req.body;
      
      if (!targetType || !videoUrl || !title) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Extract video ID from YouTube URL
      let videoId = "";
      try {
        const url = new URL(videoUrl);
        if (url.hostname.includes("youtube.com")) {
          videoId = url.searchParams.get("v") || "";
        } else if (url.hostname.includes("youtu.be")) {
          videoId = url.pathname.slice(1);
        }
      } catch {
        return res.status(400).json({ error: "Invalid YouTube URL" });
      }
      
      if (!videoId) {
        return res.status(400).json({ error: "Could not extract video ID from URL" });
      }
      
      const reference = await storage.createYoutubeReference({
        addedBy: user.id,
        targetType,
        targetId: targetId || null,
        targetStringId: targetStringId || null,
        videoUrl,
        videoId,
        title,
        description: description || null,
        thumbnailUrl: thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        category: category || null,
        tags: tags || null,
      });
      res.status(201).json(reference);
    } catch (error) {
      console.error("Error adding YouTube reference:", error);
      res.status(500).json({ error: "Failed to add YouTube reference" });
    }
  });

  // Update YouTube reference
  app.patch("/api/youtube-references/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getYoutubeReference(id);
      if (!existing) {
        return res.status(404).json({ error: "YouTube reference not found" });
      }
      
      const updated = await storage.updateYoutubeReference(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating YouTube reference:", error);
      res.status(500).json({ error: "Failed to update YouTube reference" });
    }
  });

  // Delete YouTube reference
  app.delete("/api/youtube-references/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getYoutubeReference(id);
      if (!existing) {
        return res.status(404).json({ error: "YouTube reference not found" });
      }
      
      await storage.deleteYoutubeReference(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting YouTube reference:", error);
      res.status(500).json({ error: "Failed to delete YouTube reference" });
    }
  });

  // ==================== BURNDOWN SNAPSHOTS API ====================

  // Get burndown snapshots
  app.get("/api/burndown", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const { campaignId, startDate, endDate } = req.query;
      const snapshots = await storage.getBurndownSnapshots(
        campaignId ? parseInt(campaignId as string) : undefined,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(snapshots);
    } catch (error) {
      console.error("Error fetching burndown snapshots:", error);
      res.status(500).json({ error: "Failed to fetch burndown snapshots" });
    }
  });

  // Get latest burndown snapshot
  app.get("/api/burndown/latest", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const { campaignId } = req.query;
      const snapshot = await storage.getLatestBurndownSnapshot(
        campaignId ? parseInt(campaignId as string) : undefined
      );
      res.json(snapshot || null);
    } catch (error) {
      console.error("Error fetching latest burndown:", error);
      res.status(500).json({ error: "Failed to fetch latest burndown" });
    }
  });

  // Generate new burndown snapshot
  app.post("/api/burndown/generate", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const { campaignId } = req.body;
      const snapshot = await storage.generateBurndownSnapshot(
        campaignId ? parseInt(campaignId) : undefined
      );
      res.status(201).json(snapshot);
    } catch (error) {
      console.error("Error generating burndown snapshot:", error);
      res.status(500).json({ error: "Failed to generate burndown snapshot" });
    }
  });

  // ==================== LIBRARY ASSETS API ====================

  // Get library assets with filters
  app.get("/api/library-assets", isAuthenticated, async (req: any, res) => {
    try {
      const { category, clientProfileId, isPublic, search } = req.query;
      
      if (search) {
        const assets = await storage.searchLibraryAssets(search as string);
        return res.json(assets);
      }
      
      const filters: any = {};
      if (category) filters.category = category;
      if (clientProfileId) filters.clientProfileId = parseInt(clientProfileId as string);
      if (isPublic !== undefined) filters.isPublic = isPublic === "true";
      
      const assets = await storage.getLibraryAssets(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching library assets:", error);
      res.status(500).json({ error: "Failed to fetch library assets" });
    }
  });

  // Get asset stats
  app.get("/api/library-assets/stats", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const stats = await storage.getAssetStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching asset stats:", error);
      res.status(500).json({ error: "Failed to fetch asset stats" });
    }
  });

  // Get single asset
  app.get("/api/library-assets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getLibraryAsset(id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error fetching asset:", error);
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  // Create library asset
  app.post("/api/library-assets", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const { name, description, fileUrl, thumbnailUrl, fileType, fileSize, category, tags, clientProfileId, isPublic, metadata } = req.body;
      
      if (!name || !fileUrl || !fileType || !category) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const asset = await storage.createLibraryAsset({
        uploadedBy: user.id,
        name,
        description: description || null,
        fileUrl,
        thumbnailUrl: thumbnailUrl || null,
        fileType,
        fileSize: fileSize || null,
        category,
        tags: tags || null,
        clientProfileId: clientProfileId || null,
        isPublic: isPublic || false,
        metadata: metadata || null,
      });
      res.status(201).json(asset);
    } catch (error) {
      console.error("Error creating library asset:", error);
      res.status(500).json({ error: "Failed to create library asset" });
    }
  });

  // Update library asset
  app.patch("/api/library-assets/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getLibraryAsset(id);
      if (!existing) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      const updated = await storage.updateLibraryAsset(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating library asset:", error);
      res.status(500).json({ error: "Failed to update library asset" });
    }
  });

  // Delete library asset
  app.delete("/api/library-assets/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getLibraryAsset(id);
      if (!existing) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      await storage.deleteLibraryAsset(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting library asset:", error);
      res.status(500).json({ error: "Failed to delete library asset" });
    }
  });

  // Increment asset usage
  app.post("/api/library-assets/:id/use", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.incrementAssetUsage(id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error incrementing asset usage:", error);
      res.status(500).json({ error: "Failed to increment asset usage" });
    }
  });

  // Toggle asset favorite
  app.post("/api/library-assets/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.toggleAssetFavorite(id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error toggling asset favorite:", error);
      res.status(500).json({ error: "Failed to toggle asset favorite" });
    }
  });

  // ==================== TASK SUBTASKS (CHECKLISTS) ====================

  app.get("/api/task-subtasks/:taskType/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const { taskType, taskId } = req.params;
      const subtasks = await storage.getTaskSubtasks(taskType, parseInt(taskId));
      res.json(subtasks);
    } catch (error) {
      console.error("Error fetching task subtasks:", error);
      res.status(500).json({ error: "Failed to fetch subtasks" });
    }
  });

  app.post("/api/task-subtasks", isAuthenticated, async (req: any, res) => {
    try {
      const { taskType, taskId, title, assignedTo, dueDate } = req.body;
      if (!taskType || !taskId || !title) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const subtask = await storage.createTaskSubtask({ taskType, taskId, title, assignedTo, dueDate });
      res.status(201).json(subtask);
    } catch (error) {
      console.error("Error creating subtask:", error);
      res.status(500).json({ error: "Failed to create subtask" });
    }
  });

  app.patch("/api/task-subtasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateTaskSubtask(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Subtask not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating subtask:", error);
      res.status(500).json({ error: "Failed to update subtask" });
    }
  });

  app.delete("/api/task-subtasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTaskSubtask(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting subtask:", error);
      res.status(500).json({ error: "Failed to delete subtask" });
    }
  });

  app.post("/api/task-subtasks/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const { taskType, taskId, subtaskIds } = req.body;
      await storage.reorderTaskSubtasks(taskType, taskId, subtaskIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering subtasks:", error);
      res.status(500).json({ error: "Failed to reorder subtasks" });
    }
  });

  // ==================== CLIENT DOCUMENTS (DOCS HUB) ====================

  app.get("/api/client-documents/:clientProfileId", isAuthenticated, async (req: any, res) => {
    try {
      const clientProfileId = parseInt(req.params.clientProfileId);
      const includeArchived = req.query.includeArchived === "true";
      const docs = await storage.getClientDocuments(clientProfileId, includeArchived);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching client documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/client-documents/:clientProfileId/search", isAuthenticated, async (req: any, res) => {
    try {
      const clientProfileId = parseInt(req.params.clientProfileId);
      const query = req.query.q as string || "";
      const docs = await storage.searchClientDocuments(clientProfileId, query);
      res.json(docs);
    } catch (error) {
      console.error("Error searching client documents:", error);
      res.status(500).json({ error: "Failed to search documents" });
    }
  });

  app.post("/api/client-documents", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const doc = await storage.createClientDocument({ ...req.body, uploadedBy: user.id });
      res.status(201).json(doc);
    } catch (error) {
      console.error("Error creating client document:", error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  app.patch("/api/client-documents/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateClientDocument(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating client document:", error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  app.post("/api/client-documents/:id/archive", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const archived = await storage.archiveClientDocument(id);
      if (!archived) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(archived);
    } catch (error) {
      console.error("Error archiving client document:", error);
      res.status(500).json({ error: "Failed to archive document" });
    }
  });

  app.delete("/api/client-documents/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteClientDocument(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting client document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // ==================== WHITEBOARDS ====================

  app.get("/api/whiteboards", isAuthenticated, async (req: any, res) => {
    try {
      const { clientProfileId, campaignId } = req.query;
      const filters: any = {};
      if (clientProfileId) filters.clientProfileId = parseInt(clientProfileId as string);
      if (campaignId) filters.campaignId = parseInt(campaignId as string);
      const boards = await storage.getWhiteboards(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(boards);
    } catch (error) {
      console.error("Error fetching whiteboards:", error);
      res.status(500).json({ error: "Failed to fetch whiteboards" });
    }
  });

  app.get("/api/whiteboards/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const board = await storage.getWhiteboard(id);
      if (!board) {
        return res.status(404).json({ error: "Whiteboard not found" });
      }
      res.json(board);
    } catch (error) {
      console.error("Error fetching whiteboard:", error);
      res.status(500).json({ error: "Failed to fetch whiteboard" });
    }
  });

  app.post("/api/whiteboards", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const board = await storage.createWhiteboard({ ...req.body, createdBy: user.id });
      res.status(201).json(board);
    } catch (error) {
      console.error("Error creating whiteboard:", error);
      res.status(500).json({ error: "Failed to create whiteboard" });
    }
  });

  app.patch("/api/whiteboards/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const updated = await storage.updateWhiteboard(id, req.body, user.id);
      if (!updated) {
        return res.status(404).json({ error: "Whiteboard not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating whiteboard:", error);
      res.status(500).json({ error: "Failed to update whiteboard" });
    }
  });

  app.delete("/api/whiteboards/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWhiteboard(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting whiteboard:", error);
      res.status(500).json({ error: "Failed to delete whiteboard" });
    }
  });

  // ==================== WHITEBOARD ELEMENTS ====================

  app.get("/api/whiteboards/:whiteboardId/elements", isAuthenticated, async (req: any, res) => {
    try {
      const whiteboardId = parseInt(req.params.whiteboardId);
      const elements = await storage.getWhiteboardElements(whiteboardId);
      res.json(elements);
    } catch (error) {
      console.error("Error fetching whiteboard elements:", error);
      res.status(500).json({ error: "Failed to fetch elements" });
    }
  });

  app.post("/api/whiteboards/:whiteboardId/elements", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const whiteboardId = parseInt(req.params.whiteboardId);
      const element = await storage.createWhiteboardElement({ ...req.body, whiteboardId, createdBy: user.id });
      res.status(201).json(element);
    } catch (error) {
      console.error("Error creating whiteboard element:", error);
      res.status(500).json({ error: "Failed to create element" });
    }
  });

  app.patch("/api/whiteboard-elements/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateWhiteboardElement(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Element not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating whiteboard element:", error);
      res.status(500).json({ error: "Failed to update element" });
    }
  });

  app.patch("/api/whiteboards/:whiteboardId/elements/bulk", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const { updates } = req.body;
      const results = await storage.bulkUpdateWhiteboardElements(updates);
      res.json(results);
    } catch (error) {
      console.error("Error bulk updating whiteboard elements:", error);
      res.status(500).json({ error: "Failed to bulk update elements" });
    }
  });

  app.delete("/api/whiteboard-elements/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWhiteboardElement(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting whiteboard element:", error);
      res.status(500).json({ error: "Failed to delete element" });
    }
  });

  // ==================== WHITEBOARD CONNECTORS ====================

  app.get("/api/whiteboards/:whiteboardId/connectors", isAuthenticated, async (req: any, res) => {
    try {
      const whiteboardId = parseInt(req.params.whiteboardId);
      const connectors = await storage.getWhiteboardConnectors(whiteboardId);
      res.json(connectors);
    } catch (error) {
      console.error("Error fetching whiteboard connectors:", error);
      res.status(500).json({ error: "Failed to fetch connectors" });
    }
  });

  app.post("/api/whiteboards/:whiteboardId/connectors", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const whiteboardId = parseInt(req.params.whiteboardId);
      const connector = await storage.createWhiteboardConnector({ ...req.body, whiteboardId });
      res.status(201).json(connector);
    } catch (error) {
      console.error("Error creating whiteboard connector:", error);
      res.status(500).json({ error: "Failed to create connector" });
    }
  });

  app.delete("/api/whiteboard-connectors/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWhiteboardConnector(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting whiteboard connector:", error);
      res.status(500).json({ error: "Failed to delete connector" });
    }
  });

  // ==================== WHITEBOARD COLLABORATORS ====================

  app.get("/api/whiteboards/:whiteboardId/collaborators", isAuthenticated, async (req: any, res) => {
    try {
      const whiteboardId = parseInt(req.params.whiteboardId);
      const active = req.query.active === "true";
      const collabs = active 
        ? await storage.getActiveWhiteboardCollaborators(whiteboardId)
        : await storage.getWhiteboardCollaborators(whiteboardId);
      res.json(collabs);
    } catch (error) {
      console.error("Error fetching whiteboard collaborators:", error);
      res.status(500).json({ error: "Failed to fetch collaborators" });
    }
  });

  app.post("/api/whiteboards/:whiteboardId/collaborators", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const whiteboardId = parseInt(req.params.whiteboardId);
      const collab = await storage.addWhiteboardCollaborator({ ...req.body, whiteboardId });
      res.status(201).json(collab);
    } catch (error) {
      console.error("Error adding whiteboard collaborator:", error);
      res.status(500).json({ error: "Failed to add collaborator" });
    }
  });

  app.post("/api/whiteboards/:whiteboardId/cursor", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const whiteboardId = parseInt(req.params.whiteboardId);
      const { cursorX, cursorY } = req.body;
      await storage.updateCollaboratorCursor(whiteboardId, user.id, cursorX, cursorY);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating cursor:", error);
      res.status(500).json({ error: "Failed to update cursor" });
    }
  });

  app.post("/api/whiteboards/:whiteboardId/presence", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const whiteboardId = parseInt(req.params.whiteboardId);
      const { isActive } = req.body;
      await storage.setCollaboratorActive(whiteboardId, user.id, isActive);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating presence:", error);
      res.status(500).json({ error: "Failed to update presence" });
    }
  });

  // ==================== ENHANCED TASK WATCHERS ====================

  app.get("/api/task-watchers/:taskType/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const { taskType, taskId } = req.params;
      const watchers = await storage.getTaskWatchersByType(taskType, parseInt(taskId));
      res.json(watchers);
    } catch (error) {
      console.error("Error fetching task watchers:", error);
      res.status(500).json({ error: "Failed to fetch watchers" });
    }
  });

  app.get("/api/my-watched-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const taskType = req.query.taskType as string | undefined;
      const watched = await storage.getUserWatchedTasks(user.id, taskType);
      res.json(watched);
    } catch (error) {
      console.error("Error fetching watched tasks:", error);
      res.status(500).json({ error: "Failed to fetch watched tasks" });
    }
  });

  app.post("/api/task-watchers/:taskType/:taskId/watch", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { taskType, taskId } = req.params;
      const watcher = await storage.watchTaskByType(taskType, parseInt(taskId), user.id, req.body);
      res.status(201).json(watcher);
    } catch (error) {
      console.error("Error watching task:", error);
      res.status(500).json({ error: "Failed to watch task" });
    }
  });

  app.delete("/api/task-watchers/:taskType/:taskId/watch", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { taskType, taskId } = req.params;
      await storage.unwatchTaskByType(taskType, parseInt(taskId), user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unwatching task:", error);
      res.status(500).json({ error: "Failed to unwatch task" });
    }
  });

  // ==================== DAO MANAGEMENT SYSTEM ROUTES ====================

  // DAO Roles
  app.get("/api/dao/roles", isAuthenticated, async (req: any, res) => {
    try {
      const roles = await storage.getDaoRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching DAO roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.post("/api/dao/roles", requireRole("admin"), async (req: any, res) => {
    try {
      const role = await storage.createDaoRole(req.body);
      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating DAO role:", error);
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  app.patch("/api/dao/roles/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const role = await storage.updateDaoRole(id, req.body);
      res.json(role);
    } catch (error) {
      console.error("Error updating DAO role:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // DAO Memberships
  app.get("/api/dao/memberships", isAuthenticated, async (req: any, res) => {
    try {
      const memberships = await storage.getDaoMemberships();
      res.json(memberships);
    } catch (error) {
      console.error("Error fetching DAO memberships:", error);
      res.status(500).json({ error: "Failed to fetch memberships" });
    }
  });

  app.get("/api/dao/memberships/council", isAuthenticated, async (req: any, res) => {
    try {
      const council = await storage.getCouncilMembers();
      res.json(council);
    } catch (error) {
      console.error("Error fetching council members:", error);
      res.status(500).json({ error: "Failed to fetch council members" });
    }
  });

  app.get("/api/dao/memberships/me", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const membership = await storage.getDaoMembershipByUserId(user.id);
      res.json(membership || null);
    } catch (error) {
      console.error("Error fetching my DAO membership:", error);
      res.status(500).json({ error: "Failed to fetch membership" });
    }
  });

  app.get("/api/dao/memberships/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const membership = await storage.getDaoMembership(id);
      res.json(membership);
    } catch (error) {
      console.error("Error fetching DAO membership:", error);
      res.status(500).json({ error: "Failed to fetch membership" });
    }
  });

  app.post("/api/dao/memberships", requireRole("admin"), async (req: any, res) => {
    try {
      const membership = await storage.createDaoMembership(req.body);
      res.status(201).json(membership);
    } catch (error) {
      console.error("Error creating DAO membership:", error);
      res.status(500).json({ error: "Failed to create membership" });
    }
  });

  app.patch("/api/dao/memberships/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const membership = await storage.updateDaoMembership(id, req.body);
      res.json(membership);
    } catch (error) {
      console.error("Error updating DAO membership:", error);
      res.status(500).json({ error: "Failed to update membership" });
    }
  });

  // DAO Service Catalog
  app.get("/api/dao/services", isAuthenticated, async (req: any, res) => {
    try {
      const activeOnly = req.query.activeOnly !== "false";
      const services = await storage.getDaoServiceCatalog(activeOnly);
      res.json(services);
    } catch (error) {
      console.error("Error fetching DAO services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.get("/api/dao/services/category/:category", isAuthenticated, async (req: any, res) => {
    try {
      const services = await storage.getDaoServicesByCategory(req.params.category);
      res.json(services);
    } catch (error) {
      console.error("Error fetching services by category:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.get("/api/dao/services/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const service = await storage.getDaoService(id);
      res.json(service);
    } catch (error) {
      console.error("Error fetching DAO service:", error);
      res.status(500).json({ error: "Failed to fetch service" });
    }
  });

  app.post("/api/dao/services", requireRole("admin"), async (req: any, res) => {
    try {
      const service = await storage.createDaoService(req.body);
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating DAO service:", error);
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  app.patch("/api/dao/services/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const service = await storage.updateDaoService(id, req.body);
      res.json(service);
    } catch (error) {
      console.error("Error updating DAO service:", error);
      res.status(500).json({ error: "Failed to update service" });
    }
  });

  app.delete("/api/dao/services/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDaoService(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting DAO service:", error);
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  // DAO Discounts
  app.get("/api/dao/discounts", isAuthenticated, async (req: any, res) => {
    try {
      const activeOnly = req.query.activeOnly !== "false";
      const discounts = await storage.getDaoDiscounts(activeOnly);
      res.json(discounts);
    } catch (error) {
      console.error("Error fetching DAO discounts:", error);
      res.status(500).json({ error: "Failed to fetch discounts" });
    }
  });

  app.post("/api/dao/discounts", requireRole("admin"), async (req: any, res) => {
    try {
      const discount = await storage.createDaoDiscount(req.body);
      res.status(201).json(discount);
    } catch (error) {
      console.error("Error creating DAO discount:", error);
      res.status(500).json({ error: "Failed to create discount" });
    }
  });

  app.patch("/api/dao/discounts/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const discount = await storage.updateDaoDiscount(id, req.body);
      res.json(discount);
    } catch (error) {
      console.error("Error updating DAO discount:", error);
      res.status(500).json({ error: "Failed to update discount" });
    }
  });

  app.delete("/api/dao/discounts/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDaoDiscount(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting DAO discount:", error);
      res.status(500).json({ error: "Failed to delete discount" });
    }
  });

  // DAO Projects
  app.get("/api/dao/projects", isAuthenticated, async (req: any, res) => {
    try {
      const filters: { status?: string; clientProfileId?: number } = {};
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.clientProfileId) filters.clientProfileId = parseInt(req.query.clientProfileId);
      const projects = await storage.getDaoProjects(filters);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching DAO projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/dao/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getDaoProject(id);
      res.json(project);
    } catch (error) {
      console.error("Error fetching DAO project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/dao/projects", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const project = await storage.createDaoProject({ ...req.body, createdBy: user.id });
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating DAO project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/dao/projects/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.updateDaoProject(id, req.body);
      res.json(project);
    } catch (error) {
      console.error("Error updating DAO project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/dao/projects/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDaoProject(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting DAO project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // DAO Project Services
  app.get("/api/dao/projects/:projectId/services", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const services = await storage.getDaoProjectServices(projectId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching project services:", error);
      res.status(500).json({ error: "Failed to fetch project services" });
    }
  });

  app.post("/api/dao/projects/:projectId/services", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const service = await storage.createDaoProjectService({ ...req.body, projectId });
      res.status(201).json(service);
    } catch (error) {
      console.error("Error adding project service:", error);
      res.status(500).json({ error: "Failed to add project service" });
    }
  });

  app.delete("/api/dao/project-services/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDaoProjectService(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing project service:", error);
      res.status(500).json({ error: "Failed to remove project service" });
    }
  });

  // DAO Revenue Attributions
  app.get("/api/dao/projects/:projectId/attributions", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const attributions = await storage.getDaoRevenueAttributions(projectId);
      res.json(attributions);
    } catch (error) {
      console.error("Error fetching revenue attributions:", error);
      res.status(500).json({ error: "Failed to fetch attributions" });
    }
  });

  app.get("/api/dao/memberships/:membershipId/attributions", isAuthenticated, async (req: any, res) => {
    try {
      const membershipId = parseInt(req.params.membershipId);
      const attributions = await storage.getDaoRevenueAttributionsByMember(membershipId);
      res.json(attributions);
    } catch (error) {
      console.error("Error fetching member attributions:", error);
      res.status(500).json({ error: "Failed to fetch attributions" });
    }
  });

  app.post("/api/dao/projects/:projectId/attributions", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const attribution = await storage.createDaoRevenueAttribution({ ...req.body, projectId });
      res.status(201).json(attribution);
    } catch (error) {
      console.error("Error creating attribution:", error);
      res.status(500).json({ error: "Failed to create attribution" });
    }
  });

  app.post("/api/dao/attributions", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const { projectId, ...data } = req.body;
      if (!projectId) {
        return res.status(400).json({ error: "projectId is required" });
      }
      const attribution = await storage.createDaoRevenueAttribution({ ...data, projectId });
      res.status(201).json(attribution);
    } catch (error) {
      console.error("Error creating attribution:", error);
      res.status(500).json({ error: "Failed to create attribution" });
    }
  });

  app.post("/api/dao/projects/:projectId/attributions/apply-template", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { leadId, pmId, coreContributors, supportContributors } = req.body;
      const attributions = await storage.applyDefaultAttributionTemplate(
        projectId, leadId, pmId, coreContributors || [], supportContributors || []
      );
      res.status(201).json(attributions);
    } catch (error) {
      console.error("Error applying attribution template:", error);
      res.status(500).json({ error: "Failed to apply template" });
    }
  });

  app.post("/api/dao/attributions/:id/approve", requireRole("admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const attribution = await storage.approveDaoRevenueAttribution(id, user.id);
      res.json(attribution);
    } catch (error) {
      console.error("Error approving attribution:", error);
      res.status(500).json({ error: "Failed to approve attribution" });
    }
  });

  // DAO Debriefs
  app.get("/api/dao/debriefs", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId) : undefined;
      const debriefs = await storage.getDaoDebriefs(projectId);
      res.json(debriefs);
    } catch (error) {
      console.error("Error fetching debriefs:", error);
      res.status(500).json({ error: "Failed to fetch debriefs" });
    }
  });

  app.get("/api/dao/projects/:projectId/debriefs", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const debriefs = await storage.getDaoDebriefs(projectId);
      res.json(debriefs);
    } catch (error) {
      console.error("Error fetching project debriefs:", error);
      res.status(500).json({ error: "Failed to fetch debriefs" });
    }
  });

  app.get("/api/dao/debriefs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const debrief = await storage.getDaoDebrief(id);
      res.json(debrief);
    } catch (error) {
      console.error("Error fetching debrief:", error);
      res.status(500).json({ error: "Failed to fetch debrief" });
    }
  });

  app.post("/api/dao/debriefs", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const debrief = await storage.createDaoDebrief({ ...req.body, submittedBy: user.id });
      res.status(201).json(debrief);
    } catch (error) {
      console.error("Error creating debrief:", error);
      res.status(500).json({ error: "Failed to create debrief" });
    }
  });

  app.patch("/api/dao/debriefs/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const debrief = await storage.updateDaoDebrief(id, req.body);
      res.json(debrief);
    } catch (error) {
      console.error("Error updating debrief:", error);
      res.status(500).json({ error: "Failed to update debrief" });
    }
  });

  // DAO Treasury
  app.get("/api/dao/treasury", isAuthenticated, async (req: any, res) => {
    try {
      let treasury = await storage.getDaoTreasury();
      if (!treasury) {
        treasury = await storage.initializeDaoTreasury();
      }
      res.json(treasury);
    } catch (error) {
      console.error("Error fetching treasury:", error);
      res.status(500).json({ error: "Failed to fetch treasury" });
    }
  });

  app.get("/api/dao/treasury/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const transactions = await storage.getDaoTreasuryTransactions(limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching treasury transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/dao/treasury/transactions", requireRole("admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const transaction = await storage.createDaoTreasuryTransaction({ ...req.body, createdBy: user.id });
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating treasury transaction:", error);
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  // DAO Bonus Runs
  app.get("/api/dao/bonus-runs", isAuthenticated, async (req: any, res) => {
    try {
      const runs = await storage.getDaoBonusRuns();
      res.json(runs);
    } catch (error) {
      console.error("Error fetching bonus runs:", error);
      res.status(500).json({ error: "Failed to fetch bonus runs" });
    }
  });

  app.get("/api/dao/bonus-runs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const run = await storage.getDaoBonusRun(id);
      const recipients = await storage.getDaoBonusRunRecipients(id);
      res.json({ ...run, recipients });
    } catch (error) {
      console.error("Error fetching bonus run:", error);
      res.status(500).json({ error: "Failed to fetch bonus run" });
    }
  });

  app.get("/api/dao/bonus-runs/simulate", isAuthenticated, async (req: any, res) => {
    try {
      const simulation = await storage.simulateBonusDistribution();
      res.json(simulation);
    } catch (error) {
      console.error("Error simulating bonus distribution:", error);
      res.status(500).json({ error: "Failed to simulate distribution" });
    }
  });

  app.post("/api/dao/bonus-runs", requireRole("admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const membership = await storage.getDaoMembershipByUserId(user.id);
      if (!membership?.isCouncil) {
        return res.status(403).json({ error: "Only council members can trigger bonus distributions" });
      }
      const run = await storage.executeBonusDistribution(user.id);
      if (!run) {
        return res.status(400).json({ error: "Bonus distribution not eligible or failed" });
      }
      res.status(201).json(run);
    } catch (error) {
      console.error("Error triggering bonus distribution:", error);
      res.status(500).json({ error: "Failed to trigger distribution" });
    }
  });

  app.post("/api/dao/bonus-runs/execute", requireRole("admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      // Verify council membership for bonus execution
      const membership = await storage.getDaoMembershipByUserId(user.id);
      if (!membership?.isCouncil) {
        return res.status(403).json({ error: "Only council members can execute bonus distributions" });
      }
      const run = await storage.executeBonusDistribution(user.id);
      if (!run) {
        return res.status(400).json({ error: "Bonus distribution not eligible or failed" });
      }
      res.status(201).json(run);
    } catch (error) {
      console.error("Error executing bonus distribution:", error);
      res.status(500).json({ error: "Failed to execute distribution" });
    }
  });

  // DAO Invoices
  app.get("/api/dao/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId) : undefined;
      const invoices = await storage.getDaoInvoices(projectId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/dao/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getDaoInvoice(id);
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/dao/projects/:projectId/invoices/generate", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const projectId = parseInt(req.params.projectId);
      const invoices = await storage.generateProjectInvoices(projectId, user.id);
      res.status(201).json(invoices);
    } catch (error) {
      console.error("Error generating invoices:", error);
      res.status(500).json({ error: "Failed to generate invoices" });
    }
  });

  app.patch("/api/dao/invoices/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.updateDaoInvoice(id, req.body);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.post("/api/dao/invoices/:id/mark-paid", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { paymentMethod, paymentReference } = req.body;
      const invoice = await storage.markDaoInvoicePaid(id, paymentMethod, paymentReference);
      
      // Record treasury contribution (15% of paid amount)
      if (invoice) {
        const user = req.user as User;
        const treasuryContribution = Math.round(invoice.amount * 0.15);
        await storage.recordProjectTreasuryContribution(invoice.projectId, treasuryContribution, user.id);
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Error marking invoice paid:", error);
      res.status(500).json({ error: "Failed to mark invoice paid" });
    }
  });

  // DAO Rank Progressions
  app.get("/api/dao/rank-progressions", isAuthenticated, async (req: any, res) => {
    try {
      const membershipId = req.query.membershipId ? parseInt(req.query.membershipId) : undefined;
      const progressions = await storage.getDaoRankProgressions(membershipId);
      res.json(progressions);
    } catch (error) {
      console.error("Error fetching rank progressions:", error);
      res.status(500).json({ error: "Failed to fetch progressions" });
    }
  });

  app.post("/api/dao/memberships/:membershipId/check-promotion", requireRole("admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const membershipId = parseInt(req.params.membershipId);
      const progression = await storage.checkAndPromoteMember(membershipId, user.id);
      res.json(progression || { promoted: false });
    } catch (error) {
      console.error("Error checking promotion:", error);
      res.status(500).json({ error: "Failed to check promotion" });
    }
  });

  // DAO Project Links
  app.get("/api/dao/projects/:projectId/links", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const links = await storage.getDaoProjectLinks(projectId);
      res.json(links);
    } catch (error) {
      console.error("Error fetching project links:", error);
      res.status(500).json({ error: "Failed to fetch links" });
    }
  });

  app.post("/api/dao/projects/:projectId/links", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const link = await storage.createDaoProjectLink({ ...req.body, projectId });
      res.status(201).json(link);
    } catch (error) {
      console.error("Error creating project link:", error);
      res.status(500).json({ error: "Failed to create link" });
    }
  });

  app.delete("/api/dao/project-links/:id", requireRole("content", "admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDaoProjectLink(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project link:", error);
      res.status(500).json({ error: "Failed to delete link" });
    }
  });

  // DAO Permissions
  app.get("/api/dao/memberships/:membershipId/permissions", isAuthenticated, async (req: any, res) => {
    try {
      const membershipId = parseInt(req.params.membershipId);
      const permissions = await storage.getDaoPermissions(membershipId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  app.post("/api/dao/permissions", requireRole("admin"), async (req: any, res) => {
    try {
      const permission = await storage.createDaoPermission(req.body);
      res.status(201).json(permission);
    } catch (error) {
      console.error("Error creating permission:", error);
      res.status(500).json({ error: "Failed to create permission" });
    }
  });

  app.patch("/api/dao/permissions/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const permission = await storage.updateDaoPermission(id, req.body);
      res.json(permission);
    } catch (error) {
      console.error("Error updating permission:", error);
      res.status(500).json({ error: "Failed to update permission" });
    }
  });

  // DAO Safe Wallets
  app.get("/api/dao/safe-wallets", isAuthenticated, async (req: any, res) => {
    try {
      const wallets = await storage.getDaoSafeWallets();
      res.json(wallets);
    } catch (error) {
      console.error("Error fetching safe wallets:", error);
      res.status(500).json({ error: "Failed to fetch safe wallets" });
    }
  });

  app.get("/api/dao/safe-wallets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const wallet = await storage.getDaoSafeWallet(id);
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      res.json(wallet);
    } catch (error) {
      console.error("Error fetching safe wallet:", error);
      res.status(500).json({ error: "Failed to fetch safe wallet" });
    }
  });

  app.post("/api/dao/safe-wallets", requireRole("admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const { address, chainId, label } = req.body;
      
      if (!address || !chainId || !label) {
        return res.status(400).json({ error: "Missing required fields: address, chainId, label" });
      }
      
      // Check if wallet already exists
      const existing = await storage.getDaoSafeWalletByAddress(address, chainId);
      if (existing) {
        return res.status(409).json({ error: "Wallet already connected on this chain" });
      }
      
      // Validate it's a real Safe wallet
      const safeService = await import("./safe-service");
      let safeInfo;
      try {
        safeInfo = await safeService.getSafeInfo(address, chainId);
      } catch (error: any) {
        return res.status(400).json({ error: `Invalid Safe wallet: ${error.message}` });
      }
      
      const wallet = await storage.createDaoSafeWallet({
        address,
        chainId,
        label,
        owners: JSON.stringify(safeInfo.owners),
        threshold: safeInfo.threshold,
        nonce: safeInfo.nonce,
        addedBy: user.id,
        lastSyncedAt: new Date(),
      });
      
      res.status(201).json(wallet);
    } catch (error) {
      console.error("Error creating safe wallet:", error);
      res.status(500).json({ error: "Failed to create safe wallet" });
    }
  });

  app.patch("/api/dao/safe-wallets/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const wallet = await storage.updateDaoSafeWallet(id, req.body);
      res.json(wallet);
    } catch (error) {
      console.error("Error updating safe wallet:", error);
      res.status(500).json({ error: "Failed to update safe wallet" });
    }
  });

  app.delete("/api/dao/safe-wallets/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDaoSafeWallet(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting safe wallet:", error);
      res.status(500).json({ error: "Failed to delete safe wallet" });
    }
  });

  // Safe Wallet Balances
  app.get("/api/dao/safe-wallets/:id/balances", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const wallet = await storage.getDaoSafeWallet(id);
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      
      const safeService = await import("./safe-service");
      const balances = await safeService.getSafeBalances(wallet.address, wallet.chainId);
      
      // Cache balances in database
      await storage.upsertDaoSafeBalances(id, balances.map(b => ({
        walletId: id,
        tokenAddress: b.tokenAddress,
        tokenSymbol: b.tokenSymbol,
        tokenName: b.tokenName,
        tokenDecimals: b.tokenDecimals,
        balance: b.balance,
        balanceUsd: b.fiatBalance ? parseFloat(b.fiatBalance) : null,
      })));
      
      res.json(balances);
    } catch (error) {
      console.error("Error fetching safe wallet balances:", error);
      res.status(500).json({ error: "Failed to fetch balances" });
    }
  });

  // Safe Wallet Pending Transactions
  app.get("/api/dao/safe-wallets/:id/pending-txs", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const wallet = await storage.getDaoSafeWallet(id);
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      
      const safeService = await import("./safe-service");
      const pendingTxs = await safeService.getPendingTransactions(wallet.address, wallet.chainId);
      
      res.json(pendingTxs);
    } catch (error) {
      console.error("Error fetching pending transactions:", error);
      res.status(500).json({ error: "Failed to fetch pending transactions" });
    }
  });

  // Safe Wallet Transaction History
  app.get("/api/dao/safe-wallets/:id/tx-history", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const wallet = await storage.getDaoSafeWallet(id);
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit) : 20;
      const safeService = await import("./safe-service");
      const history = await safeService.getTransactionHistory(wallet.address, wallet.chainId, limit);
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      res.status(500).json({ error: "Failed to fetch transaction history" });
    }
  });

  // Sync all Safe wallets
  app.post("/api/dao/safe-wallets/sync-all", requireRole("admin"), async (req: any, res) => {
    try {
      const wallets = await storage.getDaoSafeWallets();
      const safeService = await import("./safe-service");
      
      const results = await Promise.allSettled(
        wallets.map(async (wallet) => {
          try {
            const info = await safeService.getSafeInfo(wallet.address, wallet.chainId);
            const balances = await safeService.getSafeBalances(wallet.address, wallet.chainId);
            
            await storage.updateDaoSafeWallet(wallet.id, {
              owners: JSON.stringify(info.owners),
              threshold: info.threshold,
              nonce: info.nonce,
              lastSyncedAt: new Date(),
            });
            
            await storage.upsertDaoSafeBalances(wallet.id, balances.map(b => ({
              walletId: wallet.id,
              tokenAddress: b.tokenAddress,
              tokenSymbol: b.tokenSymbol,
              tokenName: b.tokenName,
              tokenDecimals: b.tokenDecimals,
              balance: b.balance,
              balanceUsd: b.fiatBalance ? parseFloat(b.fiatBalance) : null,
            })));
            
            return { walletId: wallet.id, success: true };
          } catch (error: any) {
            return { walletId: wallet.id, success: false, error: error.message };
          }
        })
      );
      
      res.json({ synced: results.filter(r => r.status === "fulfilled").length, results });
    } catch (error) {
      console.error("Error syncing wallets:", error);
      res.status(500).json({ error: "Failed to sync wallets" });
    }
  });

  // Get supported chains
  app.get("/api/dao/safe-chains", isAuthenticated, async (req: any, res) => {
    try {
      const safeService = await import("./safe-service");
      const chainIds = safeService.getSupportedChainIds();
      const chains = chainIds.map(id => ({
        id,
        name: safeService.getChainName(id),
      }));
      res.json(chains);
    } catch (error) {
      console.error("Error fetching chains:", error);
      res.status(500).json({ error: "Failed to fetch chains" });
    }
  });

  // ==================== DAO MEMBER SKILLS ROUTES ====================
  
  // Helper: Check if user owns membership or is admin
  async function checkMembershipOwnership(userId: string, membershipId: number, isAdmin: boolean): Promise<boolean> {
    if (isAdmin) return true;
    const membership = await storage.getDaoMembership(membershipId);
    return membership?.userId === userId;
  }
  
  app.get("/api/dao/member-skills", isAuthenticated, async (req: any, res) => {
    try {
      const membershipId = req.query.membershipId ? parseInt(req.query.membershipId) : undefined;
      const skills = await storage.getDaoMemberSkills(membershipId);
      res.json(skills);
    } catch (error) {
      console.error("Error fetching member skills:", error);
      res.status(500).json({ error: "Failed to fetch member skills" });
    }
  });

  app.post("/api/dao/member-skills", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { membershipId, serviceCategory, proficiencyLevel } = req.body;
      
      if (!membershipId || !serviceCategory) {
        return res.status(400).json({ error: "membershipId and serviceCategory are required" });
      }
      
      if (proficiencyLevel !== undefined && (proficiencyLevel < 1 || proficiencyLevel > 5)) {
        return res.status(400).json({ error: "proficiencyLevel must be between 1 and 5" });
      }
      
      const isOwner = await checkMembershipOwnership(user.id, membershipId, user.role === "admin");
      if (!isOwner) {
        return res.status(403).json({ error: "You can only add skills to your own profile" });
      }
      
      const skill = await storage.createDaoMemberSkill(req.body);
      res.status(201).json(skill);
    } catch (error) {
      console.error("Error creating member skill:", error);
      res.status(500).json({ error: "Failed to create member skill" });
    }
  });

  app.patch("/api/dao/member-skills/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      
      const skill = await storage.getDaoMemberSkill(id);
      if (!skill) {
        return res.status(404).json({ error: "Skill not found" });
      }
      
      const isOwner = await checkMembershipOwnership(user.id, skill.membershipId, user.role === "admin");
      if (!isOwner) {
        return res.status(403).json({ error: "You can only update your own skills" });
      }
      
      const updated = await storage.updateDaoMemberSkill(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating member skill:", error);
      res.status(500).json({ error: "Failed to update member skill" });
    }
  });

  app.delete("/api/dao/member-skills/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      
      const skill = await storage.getDaoMemberSkill(id);
      if (!skill) {
        return res.status(404).json({ error: "Skill not found" });
      }
      
      const isOwner = await checkMembershipOwnership(user.id, skill.membershipId, user.role === "admin");
      if (!isOwner) {
        return res.status(403).json({ error: "You can only delete your own skills" });
      }
      
      await storage.deleteDaoMemberSkill(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting member skill:", error);
      res.status(500).json({ error: "Failed to delete member skill" });
    }
  });

  // ==================== DAO MEMBER AVAILABILITY ROUTES ====================
  
  app.get("/api/dao/member-availability", isAuthenticated, async (req: any, res) => {
    try {
      const membershipId = req.query.membershipId ? parseInt(req.query.membershipId) : undefined;
      if (membershipId) {
        const availability = await storage.getDaoMemberAvailability(membershipId);
        res.json(availability);
      } else {
        const allAvailability = await storage.getAllMemberAvailability();
        res.json(allAvailability);
      }
    } catch (error) {
      console.error("Error fetching member availability:", error);
      res.status(500).json({ error: "Failed to fetch member availability" });
    }
  });

  app.post("/api/dao/member-availability", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { membershipId, weeklyHoursAvailable } = req.body;
      
      if (!membershipId) {
        return res.status(400).json({ error: "membershipId is required" });
      }
      
      if (weeklyHoursAvailable !== undefined && (weeklyHoursAvailable < 0 || weeklyHoursAvailable > 168)) {
        return res.status(400).json({ error: "weeklyHoursAvailable must be between 0 and 168" });
      }
      
      const isOwner = await checkMembershipOwnership(user.id, membershipId, user.role === "admin");
      if (!isOwner) {
        return res.status(403).json({ error: "You can only update your own availability" });
      }
      
      const availability = await storage.upsertDaoMemberAvailability(req.body);
      res.status(201).json(availability);
    } catch (error) {
      console.error("Error updating member availability:", error);
      res.status(500).json({ error: "Failed to update member availability" });
    }
  });

  // ==================== DAO CONSISTENCY METRICS ROUTES ====================
  
  app.get("/api/dao/consistency-metrics", isAuthenticated, async (req: any, res) => {
    try {
      const membershipId = req.query.membershipId ? parseInt(req.query.membershipId) : undefined;
      if (membershipId) {
        const metrics = await storage.getDaoConsistencyMetrics(membershipId);
        res.json(metrics);
      } else {
        const allMetrics = await storage.getAllConsistencyMetrics();
        res.json(allMetrics);
      }
    } catch (error) {
      console.error("Error fetching consistency metrics:", error);
      res.status(500).json({ error: "Failed to fetch consistency metrics" });
    }
  });

  app.post("/api/dao/consistency-metrics", requireRole("admin"), async (req: any, res) => {
    try {
      const metrics = await storage.upsertDaoConsistencyMetrics(req.body);
      res.status(201).json(metrics);
    } catch (error) {
      console.error("Error updating consistency metrics:", error);
      res.status(500).json({ error: "Failed to update consistency metrics" });
    }
  });

  // ==================== DAO PEER FEEDBACK ROUTES ====================
  
  app.get("/api/dao/peer-feedback", isAuthenticated, async (req: any, res) => {
    try {
      const debriefId = req.query.debriefId ? parseInt(req.query.debriefId) : undefined;
      const membershipId = req.query.membershipId ? parseInt(req.query.membershipId) : undefined;
      
      if (debriefId) {
        const feedback = await storage.getDaoPeerFeedback(debriefId);
        res.json(feedback);
      } else if (membershipId) {
        const feedback = await storage.getFeedbackForMember(membershipId);
        res.json(feedback);
      } else {
        res.status(400).json({ error: "debriefId or membershipId required" });
      }
    } catch (error) {
      console.error("Error fetching peer feedback:", error);
      res.status(500).json({ error: "Failed to fetch peer feedback" });
    }
  });

  app.post("/api/dao/peer-feedback", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { debriefId, projectId, fromMembershipId, toMembershipId, collaborationRating, qualityRating, reliabilityRating } = req.body;
      
      if (!debriefId || !projectId || !fromMembershipId || !toMembershipId) {
        return res.status(400).json({ error: "debriefId, projectId, fromMembershipId, and toMembershipId are required" });
      }
      
      if (fromMembershipId === toMembershipId) {
        return res.status(400).json({ error: "Cannot submit feedback for yourself" });
      }
      
      const validateRating = (rating: number | undefined) => rating === undefined || (rating >= 1 && rating <= 5);
      if (!validateRating(collaborationRating) || !validateRating(qualityRating) || !validateRating(reliabilityRating)) {
        return res.status(400).json({ error: "Ratings must be between 1 and 5" });
      }
      
      const isOwner = await checkMembershipOwnership(user.id, fromMembershipId, user.role === "admin");
      if (!isOwner) {
        return res.status(403).json({ error: "You can only submit feedback from your own profile" });
      }
      
      const feedback = await storage.createDaoPeerFeedback(req.body);
      res.status(201).json(feedback);
    } catch (error) {
      console.error("Error creating peer feedback:", error);
      res.status(500).json({ error: "Failed to create peer feedback" });
    }
  });

  // ==================== DAO PROJECT OPPORTUNITIES ROUTES ====================
  
  app.get("/api/dao/project-opportunities", isAuthenticated, async (req: any, res) => {
    try {
      const status = req.query.status as string | undefined;
      const opportunities = await storage.getDaoProjectOpportunities(status);
      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching project opportunities:", error);
      res.status(500).json({ error: "Failed to fetch project opportunities" });
    }
  });

  app.get("/api/dao/project-opportunities/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const opportunity = await storage.getDaoProjectOpportunity(id);
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      res.json(opportunity);
    } catch (error) {
      console.error("Error fetching project opportunity:", error);
      res.status(500).json({ error: "Failed to fetch project opportunity" });
    }
  });

  app.post("/api/dao/project-opportunities", requireRole("admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const opportunity = await storage.createDaoProjectOpportunity({
        ...req.body,
        createdBy: user.id,
      });
      res.status(201).json(opportunity);
    } catch (error) {
      console.error("Error creating project opportunity:", error);
      res.status(500).json({ error: "Failed to create project opportunity" });
    }
  });

  app.patch("/api/dao/project-opportunities/:id", requireRole("admin"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const opportunity = await storage.updateDaoProjectOpportunity(id, req.body);
      res.json(opportunity);
    } catch (error) {
      console.error("Error updating project opportunity:", error);
      res.status(500).json({ error: "Failed to update project opportunity" });
    }
  });

  // ==================== DAO ROLE BIDS ROUTES ====================
  
  app.get("/api/dao/role-bids", isAuthenticated, async (req: any, res) => {
    try {
      const opportunityId = req.query.opportunityId ? parseInt(req.query.opportunityId) : undefined;
      const membershipId = req.query.membershipId ? parseInt(req.query.membershipId) : undefined;
      
      if (membershipId) {
        const bids = await storage.getMemberRoleBids(membershipId);
        res.json(bids);
      } else {
        const bids = await storage.getDaoRoleBids(opportunityId);
        res.json(bids);
      }
    } catch (error) {
      console.error("Error fetching role bids:", error);
      res.status(500).json({ error: "Failed to fetch role bids" });
    }
  });

  app.post("/api/dao/role-bids", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { opportunityId, membershipId, preferredRole } = req.body;
      
      if (!opportunityId || !membershipId || !preferredRole) {
        return res.status(400).json({ error: "opportunityId, membershipId, and preferredRole are required" });
      }
      
      const validRoles = ["biz_dev", "treasury", "project_lead", "project_support", "referral"];
      if (!validRoles.includes(preferredRole)) {
        return res.status(400).json({ error: "Invalid preferredRole value" });
      }
      
      const isOwner = await checkMembershipOwnership(user.id, membershipId, user.role === "admin");
      if (!isOwner) {
        return res.status(403).json({ error: "You can only submit bids for yourself" });
      }
      
      const bid = await storage.createDaoRoleBid(req.body);
      res.status(201).json(bid);
    } catch (error) {
      console.error("Error creating role bid:", error);
      res.status(500).json({ error: "Failed to create role bid" });
    }
  });

  app.patch("/api/dao/role-bids/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const isAdmin = user.role === "admin";
      
      const existingBid = await storage.getDaoRoleBid(id);
      if (!existingBid) {
        return res.status(404).json({ error: "Role bid not found" });
      }
      
      const isOwner = await checkMembershipOwnership(user.id, existingBid.membershipId, isAdmin);
      
      const restrictedFields = ["status", "reviewedBy", "reviewNotes", "reviewedAt"];
      const hasRestrictedFields = Object.keys(req.body).some(k => restrictedFields.includes(k));
      
      if (hasRestrictedFields && !isAdmin) {
        return res.status(403).json({ error: "Only admins can change bid status" });
      }
      
      if (!isOwner && !hasRestrictedFields) {
        return res.status(403).json({ error: "You can only update your own bids" });
      }
      
      const bid = await storage.updateDaoRoleBid(id, req.body);
      res.json(bid);
    } catch (error) {
      console.error("Error updating role bid:", error);
      res.status(500).json({ error: "Failed to update role bid" });
    }
  });

  // ==================== DAO INBOUND DEALS ROUTES ====================
  
  app.get("/api/dao/inbound-deals", isAuthenticated, async (req: any, res) => {
    try {
      const status = req.query.status as string | undefined;
      const membershipId = req.query.membershipId ? parseInt(req.query.membershipId) : undefined;
      
      if (membershipId) {
        const deals = await storage.getDealsByMember(membershipId);
        res.json(deals);
      } else {
        const deals = await storage.getDaoInboundDeals(status);
        res.json(deals);
      }
    } catch (error) {
      console.error("Error fetching inbound deals:", error);
      res.status(500).json({ error: "Failed to fetch inbound deals" });
    }
  });

  app.get("/api/dao/inbound-deals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const deal = await storage.getDaoInboundDeal(id);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      res.json(deal);
    } catch (error) {
      console.error("Error fetching inbound deal:", error);
      res.status(500).json({ error: "Failed to fetch inbound deal" });
    }
  });

  app.post("/api/dao/inbound-deals", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { broughtByMembershipId, clientName, source } = req.body;
      
      if (!broughtByMembershipId || !clientName || !source) {
        return res.status(400).json({ error: "broughtByMembershipId, clientName, and source are required" });
      }
      
      const validSources = ["inbound", "referral", "outbound", "ip_contribution", "partnership"];
      if (!validSources.includes(source)) {
        return res.status(400).json({ error: "Invalid source value" });
      }
      
      const isOwner = await checkMembershipOwnership(user.id, broughtByMembershipId, user.role === "admin");
      if (!isOwner) {
        return res.status(403).json({ error: "You can only submit deals for yourself" });
      }
      
      const deal = await storage.createDaoInboundDeal(req.body);
      res.status(201).json(deal);
    } catch (error) {
      console.error("Error creating inbound deal:", error);
      res.status(500).json({ error: "Failed to create inbound deal" });
    }
  });

  app.patch("/api/dao/inbound-deals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const isAdmin = user.role === "admin";
      
      const existingDeal = await storage.getDaoInboundDeal(id);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      
      const isOwner = await checkMembershipOwnership(user.id, existingDeal.broughtByMembershipId, isAdmin);
      
      const { source, status, bizDevCreditPercent, referralCreditPercent } = req.body;
      
      if (source) {
        const validSources = ["inbound", "referral", "outbound", "ip_contribution", "partnership"];
        if (!validSources.includes(source)) {
          return res.status(400).json({ error: "Invalid source value" });
        }
      }
      
      if (status) {
        const validStatuses = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: "Invalid status value" });
        }
      }
      
      if (bizDevCreditPercent !== undefined && (bizDevCreditPercent < 0 || bizDevCreditPercent > 100)) {
        return res.status(400).json({ error: "bizDevCreditPercent must be between 0 and 100" });
      }
      
      if (referralCreditPercent !== undefined && (referralCreditPercent < 0 || referralCreditPercent > 100)) {
        return res.status(400).json({ error: "referralCreditPercent must be between 0 and 100" });
      }
      
      const restrictedFields = ["status", "projectId", "convertedToProjectAt", "bizDevCreditPercent", "referralCreditPercent", "source"];
      const hasRestrictedFields = Object.keys(req.body).some(k => restrictedFields.includes(k));
      
      if (hasRestrictedFields && !isAdmin) {
        return res.status(403).json({ error: "Only admins can change deal status, source, or credit percentages" });
      }
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "You can only update your own deals" });
      }
      
      const deal = await storage.updateDaoInboundDeal(id, req.body);
      res.json(deal);
    } catch (error) {
      console.error("Error updating inbound deal:", error);
      res.status(500).json({ error: "Failed to update inbound deal" });
    }
  });

  // ==================== DAO IP CONTRIBUTIONS ROUTES ====================
  
  app.get("/api/dao/ip-contributions", isAuthenticated, async (req: any, res) => {
    try {
      const membershipId = req.query.membershipId ? parseInt(req.query.membershipId) : undefined;
      const contributions = await storage.getDaoIpContributions(membershipId);
      res.json(contributions);
    } catch (error) {
      console.error("Error fetching IP contributions:", error);
      res.status(500).json({ error: "Failed to fetch IP contributions" });
    }
  });

  app.get("/api/dao/ip-contributions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const contribution = await storage.getDaoIpContribution(id);
      if (!contribution) {
        return res.status(404).json({ error: "Contribution not found" });
      }
      res.json(contribution);
    } catch (error) {
      console.error("Error fetching IP contribution:", error);
      res.status(500).json({ error: "Failed to fetch IP contribution" });
    }
  });

  app.post("/api/dao/ip-contributions", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const { contributorMembershipId, ipType, name } = req.body;
      
      if (!contributorMembershipId || !ipType || !name) {
        return res.status(400).json({ error: "contributorMembershipId, ipType, and name are required" });
      }
      
      const validIpTypes = ["design", "code", "content", "brand", "game", "platform", "other"];
      if (!validIpTypes.includes(ipType)) {
        return res.status(400).json({ error: "Invalid ipType value" });
      }
      
      const isOwner = await checkMembershipOwnership(user.id, contributorMembershipId, user.role === "admin");
      if (!isOwner) {
        return res.status(403).json({ error: "You can only add IP contributions for yourself" });
      }
      
      const contribution = await storage.createDaoIpContribution(req.body);
      res.status(201).json(contribution);
    } catch (error) {
      console.error("Error creating IP contribution:", error);
      res.status(500).json({ error: "Failed to create IP contribution" });
    }
  });

  app.patch("/api/dao/ip-contributions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const isAdmin = user.role === "admin";
      
      const existingContribution = await storage.getDaoIpContribution(id);
      if (!existingContribution) {
        return res.status(404).json({ error: "IP contribution not found" });
      }
      
      const isOwner = await checkMembershipOwnership(user.id, existingContribution.contributorMembershipId, isAdmin);
      
      const { ipType, revenueSharePercent, name } = req.body;
      
      if (ipType) {
        const validIpTypes = ["design", "code", "content", "brand", "game", "platform", "other"];
        if (!validIpTypes.includes(ipType)) {
          return res.status(400).json({ error: "Invalid ipType value" });
        }
      }
      
      if (name !== undefined && (!name || name.trim().length === 0)) {
        return res.status(400).json({ error: "Name cannot be empty" });
      }
      
      if (revenueSharePercent !== undefined && (revenueSharePercent < 0 || revenueSharePercent > 100)) {
        return res.status(400).json({ error: "revenueSharePercent must be between 0 and 100" });
      }
      
      const restrictedFields = ["revenueSharePercent", "isActive", "ipType"];
      const hasRestrictedFields = Object.keys(req.body).some(k => restrictedFields.includes(k));
      
      if (hasRestrictedFields && !isAdmin) {
        return res.status(403).json({ error: "Only admins can change revenue share, active status, or IP type" });
      }
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "You can only update your own IP contributions" });
      }
      
      const contribution = await storage.updateDaoIpContribution(id, req.body);
      res.json(contribution);
    } catch (error) {
      console.error("Error updating IP contribution:", error);
      res.status(500).json({ error: "Failed to update IP contribution" });
    }
  });

  // ==================== DAO ROLE ASSIGNMENT HISTORY ROUTES ====================
  
  app.get("/api/dao/role-assignment-history", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId) : undefined;
      const membershipId = req.query.membershipId ? parseInt(req.query.membershipId) : undefined;
      
      if (membershipId) {
        const history = await storage.getMemberAssignmentHistory(membershipId);
        res.json(history);
      } else {
        const history = await storage.getDaoRoleAssignmentHistory(projectId);
        res.json(history);
      }
    } catch (error) {
      console.error("Error fetching role assignment history:", error);
      res.status(500).json({ error: "Failed to fetch role assignment history" });
    }
  });

  app.post("/api/dao/role-assignment-history", requireRole("admin"), async (req: any, res) => {
    try {
      const user = req.user as User;
      const history = await storage.createDaoRoleAssignmentHistory({
        ...req.body,
        assignedBy: user.id,
      });
      res.status(201).json(history);
    } catch (error) {
      console.error("Error creating role assignment history:", error);
      res.status(500).json({ error: "Failed to create role assignment history" });
    }
  });

  // ==================== DAO FAIRNESS DASHBOARD ROUTES ====================
  
  // Get comprehensive fairness data for dashboard
  app.get("/api/dao/fairness-dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const [
        allMetrics,
        allAvailability,
        allSkills,
        openOpportunities,
        recentAssignments,
      ] = await Promise.all([
        storage.getAllConsistencyMetrics(),
        storage.getAllMemberAvailability(),
        storage.getDaoMemberSkills(),
        storage.getDaoProjectOpportunities("open"),
        storage.getDaoRoleAssignmentHistory(),
      ]);

      // Calculate workload distribution
      const workloadByMember: { [key: number]: { lead: number; pm: number; core: number; support: number } } = {};
      for (const metric of allMetrics) {
        workloadByMember[metric.membershipId] = {
          lead: metric.leadRoleCount || 0,
          pm: metric.pmRoleCount || 0,
          core: metric.coreRoleCount || 0,
          support: metric.supportRoleCount || 0,
        };
      }

      // Calculate skill coverage
      const skillCoverage: { [key: string]: number } = {};
      for (const skill of allSkills) {
        const key = `${skill.serviceCategory}-${skill.specificService || "general"}`;
        skillCoverage[key] = (skillCoverage[key] || 0) + 1;
      }

      res.json({
        metrics: allMetrics,
        availability: allAvailability,
        skills: allSkills,
        openOpportunities,
        recentAssignments: recentAssignments.slice(0, 50),
        workloadByMember,
        skillCoverage,
      });
    } catch (error) {
      console.error("Error fetching fairness dashboard:", error);
      res.status(500).json({ error: "Failed to fetch fairness dashboard" });
    }
  });

  // Get recommended team for a project opportunity
  app.get("/api/dao/project-opportunities/:id/recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const opportunity = await storage.getDaoProjectOpportunity(id);
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }

      const [allSkills, allMetrics, allAvailability, bids] = await Promise.all([
        storage.getDaoMemberSkills(),
        storage.getAllConsistencyMetrics(),
        storage.getAllMemberAvailability(),
        storage.getDaoRoleBids(id),
      ]);

      // Score each member who bid for the opportunity
      const recommendations = bids.map(bid => {
        const memberSkills = allSkills.filter(s => s.membershipId === bid.membershipId);
        const memberMetrics = allMetrics.find(m => m.membershipId === bid.membershipId);
        const memberAvail = allAvailability.find(a => a.membershipId === bid.membershipId);

        // Calculate skill match score (0-100)
        const relevantSkills = memberSkills.filter(s => 
          opportunity.requiredServices?.includes(s.serviceCategory) ||
          opportunity.requiredServices?.includes(s.specificService || "")
        );
        const skillScore = relevantSkills.length > 0
          ? (relevantSkills.reduce((sum, s) => sum + (s.proficiencyLevel || 3), 0) / relevantSkills.length) * 20
          : 50;

        // Calculate workload score (prefer members with fewer recent assignments)
        const currentLoad = (memberMetrics?.leadRoleCount || 0) * 3 + 
                           (memberMetrics?.pmRoleCount || 0) * 2 + 
                           (memberMetrics?.coreRoleCount || 0) * 1;
        const workloadScore = Math.max(0, 100 - currentLoad * 5);

        // Calculate consistency score
        const consistencyScore = (memberMetrics?.overallReliabilityScore || 50) * 2;

        // Calculate availability score
        const availScore = memberAvail?.isAvailableForNewProjects ? 100 : 30;

        // Combined score
        const totalScore = (skillScore * 0.3) + (workloadScore * 0.25) + (consistencyScore * 0.3) + (availScore * 0.15);

        return {
          bid,
          membershipId: bid.membershipId,
          preferredRole: bid.preferredRole,
          scores: {
            skill: Math.round(skillScore),
            workload: Math.round(workloadScore),
            consistency: Math.round(consistencyScore),
            availability: Math.round(availScore),
            total: Math.round(totalScore),
          },
          recommendation: totalScore >= 70 ? "strong" : totalScore >= 50 ? "moderate" : "weak",
        };
      });

      // Sort by total score
      recommendations.sort((a, b) => b.scores.total - a.scores.total);

      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
