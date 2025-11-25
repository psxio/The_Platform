import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import type { ComparisonResult } from "@shared/schema";
import { storage } from "./storage";
import { parseFile } from "./file-parser";
import { createRequire } from "module";

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

  const httpServer = createServer(app);
  return httpServer;
}
