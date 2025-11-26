import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import type { ComparisonResult, InsertCollection } from "@shared/schema";
import { storage } from "./storage";
import { parseFile } from "./file-parser";
import { createRequire } from "module";
import { setupAuth, isAuthenticated, requireRole } from "./auth";
import { googleSheetsService } from "./google-sheets";
import { emailService } from "./email-service";

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
  // Regex to match Ethereum addresses: 0x followed by 40 hex characters
  const addressRegex = /0x[a-fA-F0-9]{40}/g;
  const matches = content.match(addressRegex) || [];
  
  // Remove duplicates and normalize to lowercase for consistency with comparison tool
  const seen = new Set<string>();
  const uniqueAddresses: string[] = [];
  
  for (const addr of matches) {
    const lowerAddr = addr.toLowerCase();
    if (!seen.has(lowerAddr)) {
      seen.add(lowerAddr);
      uniqueAddresses.push(lowerAddr); // Return lowercase for consistency
    }
  }
  
  return uniqueAddresses;
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

  // Update user role - admin role requires valid invite code
  app.patch("/api/auth/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { role, adminCode } = req.body;
      
      if (!role || !["web3", "content", "admin"].includes(role)) {
        return res.status(400).json({ error: "Valid role is required (web3, content, or admin)" });
      }
      
      // Admin role requires a valid invite code
      if (role === "admin") {
        // Check for initial admin code from environment variable
        const initialAdminCode = process.env.INITIAL_ADMIN_CODE;
        
        if (!adminCode) {
          return res.status(400).json({ error: "Admin invite code is required" });
        }
        
        // First check if it's the initial admin code
        if (initialAdminCode && adminCode === initialAdminCode) {
          // Use the initial code - it can only be used once
          // After first use, they should generate codes for others
        } else {
          // Check database for valid invite code
          const validCode = await storage.getValidAdminInviteCode(adminCode);
          if (!validCode) {
            return res.status(400).json({ error: "Invalid or expired admin invite code" });
          }
          
          // Mark the code as used
          await storage.useAdminInviteCode(adminCode, userId);
        }
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

  // ================== ADMIN INVITE CODE ENDPOINTS ==================
  // These require admin role

  // Generate new admin invite code (admins only)
  app.post("/api/admin/invite-codes", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can generate invite codes" });
      }
      
      const code = generateInviteCode();
      const inviteCode = await storage.createAdminInviteCode(code, req.user.id);
      
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
      
      const codes = await storage.getAdminInviteCodes(req.user.id);
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
      const success = await storage.deactivateAdminInviteCode(id);
      
      if (!success) {
        return res.status(404).json({ error: "Invite code not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deactivating invite code:", error);
      res.status(500).json({ error: "Failed to deactivate invite code" });
    }
  });

  // Validate an admin code (for frontend validation before submitting)
  app.post("/api/admin/validate-code", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ valid: false, error: "Code is required" });
      }
      
      // Check initial admin code
      const initialAdminCode = process.env.INITIAL_ADMIN_CODE;
      if (initialAdminCode && code === initialAdminCode) {
        return res.json({ valid: true });
      }
      
      // Check database
      const validCode = await storage.getValidAdminInviteCode(code);
      res.json({ valid: !!validCode });
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
        userId: req.user?.id,
        action: "created",
        details: { description: task.description },
      });
      
      // Send email notification if task is assigned
      if (task.assignedTo) {
        const assigneeInfo = await findAssignee(task.assignedTo);
        
        if (assigneeInfo) {
          // Create in-app notification only if we have a user account
          if (assigneeInfo.user && assigneeInfo.user.id !== req.user?.id) {
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
          if (targetEmail && assigneeInfo.user?.id !== req.user?.id) {
            await emailService.sendTaskAssignmentEmail(
              task,
              { email: targetEmail, name: assigneeInfo.name },
              assignedBy || req.user?.firstName || "Someone"
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
      const userId = req.user?.id;
      
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
              const assignerName = req.user?.firstName || updates.assignedBy || "Someone";
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
        userId: req.user?.id || null,
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
        userId: req.user?.id || null,
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
        userId: req.user?.id || null,
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
          userId: req.user?.id || null,
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
      const userId = req.user?.id;
      
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

  const httpServer = createServer(app);
  return httpServer;
}
