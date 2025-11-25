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

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
  app.post("/api/content-tasks", requireRole("content"), async (req, res) => {
    try {
      const { description, status, assignedTo, dueDate, assignedBy, client, deliverable, notes } = req.body;
      
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
      });
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating content task:", error);
      res.status(500).json({ error: "Failed to create content task" });
    }
  });

  // Update content task
  app.put("/api/content-tasks/:id", requireRole("content"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const task = await storage.updateContentTask(id, updates);
      if (!task) {
        return res.status(404).json({ error: "Content task not found" });
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
      const { person, skill, evmAddress, client } = req.body;
      
      if (!person || typeof person !== "string") {
        return res.status(400).json({ error: "Person name is required" });
      }
      
      const member = await storage.createDirectoryMember({
        person,
        skill: skill || undefined,
        evmAddress: evmAddress || undefined,
        client: client || undefined,
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
        
        // Save file to uploads directory
        const fs = await import("fs");
        const path = await import("path");
        const uploadsDir = path.join(process.cwd(), "uploads");
        
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const uniqueName = `${Date.now()}-${file.originalname}`;
        const filePath = path.join(uploadsDir, uniqueName);
        fs.writeFileSync(filePath, file.buffer);
        
        const deliverable = await storage.createDeliverable({
          taskId,
          fileName: file.originalname,
          filePath: `/uploads/${uniqueName}`,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        });
        
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
      
      // Delete file from disk
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), deliverable.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      await storage.deleteDeliverable(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting deliverable:", error);
      res.status(500).json({ error: "Failed to delete deliverable" });
    }
  });

  // ================== GOOGLE SHEETS SYNC ENDPOINTS ==================
  // These require "content" or "admin" role

  // Get Google Sheets sync status
  app.get("/api/sheets/status", requireRole("content"), async (req, res) => {
    try {
      const isConfigured = googleSheetsService.isConfigured();
      res.json({ 
        configured: isConfigured,
        sheetId: process.env.GOOGLE_SHEET_ID ? "***configured***" : null 
      });
    } catch (error) {
      console.error("Error checking sheets status:", error);
      res.status(500).json({ error: "Failed to check sheets status" });
    }
  });

  // Initialize Google Sheets connection
  app.post("/api/sheets/connect", requireRole("content"), async (req, res) => {
    try {
      const success = await googleSheetsService.initialize();
      if (success) {
        await googleSheetsService.ensureHeaderRow();
        res.json({ success: true, message: "Connected to Google Sheets" });
      } else {
        res.status(400).json({ 
          success: false, 
          error: "Failed to connect - check credentials configuration" 
        });
      }
    } catch (error) {
      console.error("Error connecting to sheets:", error);
      res.status(500).json({ error: "Failed to connect to Google Sheets" });
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

  const httpServer = createServer(app);
  return httpServer;
}
