import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import crypto from "crypto";
import type { ComparisonResult, InsertCollection } from "@shared/schema";
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
  app.get("/api/comparisons", async (req, res) => {
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
  app.get("/api/comparisons/:id", async (req, res) => {
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
  app.post("/api/extract-tweets", async (req, res) => {
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
  app.get("/api/collections", async (req, res) => {
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
  app.get("/api/collections/:id", async (req, res) => {
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
  app.post("/api/collections", async (req, res) => {
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
  app.delete("/api/collections/:id", async (req, res) => {
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
  app.post("/api/collections/:id/addresses", async (req, res) => {
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
  app.delete("/api/collections/:id/addresses/:address", async (req, res) => {
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
  app.get("/api/collections/:id/download", async (req, res) => {
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
  app.patch("/api/auth/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { role, inviteCode } = req.body;
      
      if (!role || !["web3", "content", "admin"].includes(role)) {
        return res.status(400).json({ error: "Valid role is required (web3, content, or admin)" });
      }
      
      // All roles require a valid invite code
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
        const validCode = await storage.getValidInviteCode(inviteCode, role);
        if (!validCode) {
          return res.status(400).json({ error: `Invalid or expired invite code for ${role} access` });
        }
        
        // Mark the code as used
        await storage.useInviteCode(inviteCode, userId);
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
  app.post("/api/admin/invite-codes", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/admin/invite-codes", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can view invite codes" });
      }
      
      const codes = await storage.getInviteCodes(req.user.id);
      res.json(codes);
    } catch (error) {
      console.error("Error fetching invite codes:", error);
      res.status(500).json({ error: "Failed to fetch invite codes" });
    }
  });

  // Deactivate an invite code (admins only)
  app.delete("/api/admin/invite-codes/:id", isAuthenticated, async (req: any, res) => {
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

  // ================== CONTENT TASK ENDPOINTS (ContentFlowStudio) ==================
  // These require "content" or "admin" role

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
      const { description, status, assignedTo, dueDate, assignedBy, client, deliverable, notes, priority, campaignId } = req.body;
      
      if (!description || typeof description !== "string") {
        return res.status(400).json({ error: "Description is required" });
      }
      
      const task = await storage.createContentTask({
        description,
        status: status || "TO BE STARTED",
        assignedTo: assignedTo || undefined,
        dueDate: dueDate || undefined,
        assignedBy: assignedBy || undefined,
        client: client || undefined,
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

  // Get all users (for watchers/approvals selection)
  app.get("/api/users", requireRole("content"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Return safe user data (no passwords)
      const safeUsers = users.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
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

  // Get approvals for a task
  app.get("/api/content-tasks/:id/approvals", requireRole("content"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const taskApprovals = await storage.getApprovals(taskId);
      res.json(taskApprovals);
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
      
      if (!status || !["approved", "rejected", "revision_requested"].includes(status)) {
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

  const httpServer = createServer(app);
  return httpServer;
}
