import { Request, Response } from 'express';
import { storage } from '../../storage';
import { parseFile } from '../../file-parser';
import multer from 'multer';
import type { ComparisonResult } from '@shared/schema';
import { createRequire } from 'module';

const upload = multer({ storage: multer.memoryStorage() });
const require = createRequire(import.meta.url);

// Validate Ethereum address format
function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Extract all EVM addresses from any text content
function extractEvmAddresses(content: string): string[] {
  const addressRegex = /(?<![a-fA-F0-9])0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/g;
  const matches = content.match(addressRegex) || [];
  
  const seen = new Set<string>();
  const uniqueAddresses: string[] = [];
  
  for (const addr of matches) {
    const lowerAddr = addr.toLowerCase();
    if (lowerAddr === '0x0000000000000000000000000000000000000000') {
      continue;
    }
    const withoutPrefix = lowerAddr.slice(2);
    const leadingZeros = withoutPrefix.match(/^0+/)?.[0]?.length || 0;
    if (leadingZeros >= 30) {
      continue;
    }
    
    if (!seen.has(lowerAddr)) {
      seen.add(lowerAddr);
      uniqueAddresses.push(lowerAddr);
    }
  }
  
  return uniqueAddresses;
}

// Convert file buffer to text content
async function fileToText(filename: string, buffer: Buffer): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  if (ext === 'pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text;
    } catch (e) {
      console.error('Error reading PDF file:', e);
      return '';
    }
  }
  
  if (ext === 'xlsx' || ext === 'xls') {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let allText = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        allText += XLSX.utils.sheet_to_csv(sheet) + '\n';
      }
      return allText;
    } catch (e) {
      console.error('Error reading Excel file:', e);
      return '';
    }
  }
  
  if (ext === 'json') {
    try {
      const jsonContent = JSON.parse(buffer.toString('utf-8'));
      return extractTextFromJson(jsonContent);
    } catch (e) {
      return buffer.toString('utf-8');
    }
  }
  
  return buffer.toString('utf-8');
}

// Extract text from JSON, focusing on message/text fields
function extractTextFromJson(obj: any, depth = 0): string {
  if (depth > 10) return '';
  
  const textParts: string[] = [];
  
  if (typeof obj === 'string') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      textParts.push(extractTextFromJson(item, depth + 1));
    }
  } else if (obj && typeof obj === 'object') {
    const textFields = ['text', 'message', 'content', 'body', 'description', 'caption', 'bio'];
    for (const field of textFields) {
      if (obj[field]) {
        if (typeof obj[field] === 'string') {
          textParts.push(obj[field]);
        } else if (Array.isArray(obj[field])) {
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
    const containerFields = ['messages', 'items', 'data', 'posts', 'comments', 'replies'];
    for (const field of containerFields) {
      if (obj[field] && Array.isArray(obj[field])) {
        textParts.push(extractTextFromJson(obj[field], depth + 1));
      }
    }
  }
  
  return textParts.join('\n');
}

/**
 * Get comparison history
 */
export async function getComparisons(req: Request, res: Response) {
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
}

/**
 * Get single comparison
 */
export async function getComparison(req: Request, res: Response) {
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
}

/**
 * Extract EVM addresses from files
 */
export async function extractAddresses(req: Request, res: Response) {
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

/**
 * Extract addresses from tweets
 */
export async function extractFromTweets(req: Request, res: Response) {
  try {
    const { tweetUrl } = req.body;
    
    if (!tweetUrl || typeof tweetUrl !== "string") {
      return res.status(400).json({ error: "Tweet URL is required" });
    }

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
    
    const mainAddresses = extractEvmAddresses(mainTweetText);
    mainAddresses.forEach(addr => allAddresses.add(addr));
    totalProcessed += 1;

    const searchQuery = `in_reply_to_tweet_id:${tweetId}`;
    const searchParams = new URLSearchParams({
      query: searchQuery,
      max_results: "100",
      "tweet.fields": "text",
    });

    let nextToken: string | undefined;
    let repliesProcessed = 0;

    for (let page = 0; page < 10; page++) {
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
        console.error("Error fetching replies:", repliesResponse.status);
        break;
      }

      const repliesData = await repliesResponse.json();
      const tweets = repliesData.data || [];

      if (tweets.length === 0) {
        break;
      }

      for (const tweet of tweets) {
        const replyText = tweet.text || "";
        const replyAddresses = extractEvmAddresses(replyText);
        replyAddresses.forEach(addr => allAddresses.add(addr));
        repliesProcessed += 1;
      }

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
}

/**
 * Compare two files
 */
export async function compareFiles(req: Request, res: Response) {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files.minted || !files.eligible) {
      return res.status(400).json({ 
        error: "Both files are required" 
      });
    }

    const mintedFile = files.minted[0];
    const eligibleFile = files.eligible[0];

    const mintedParsed = parseFile(mintedFile.originalname, mintedFile.buffer);
    const eligibleParsed = parseFile(eligibleFile.originalname, eligibleFile.buffer);

    const mintedSet = new Set(
      mintedParsed.addresses.map(addr => addr.address.toLowerCase())
    );

    const notMinted = eligibleParsed.addresses.filter(
      addr => !mintedSet.has(addr.address.toLowerCase())
    );

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

/**
 * Compare with collection
 */
export async function compareWithCollection(req: Request, res: Response) {
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

    const mintedAddresses = await storage.getMintedAddresses(collectionId);
    const mintedSet = new Set(mintedAddresses.map(addr => addr.toLowerCase()));

    const eligibleParsed = parseFile(file.originalname, file.buffer);

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

/**
 * Get all collections
 */
export async function getCollections(req: Request, res: Response) {
  try {
    const collections = await storage.getCollections();
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
}

/**
 * Get single collection
 */
export async function getCollection(req: Request, res: Response) {
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
}

/**
 * Create new collection
 */
export async function createCollection(req: Request, res: Response) {
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
    if (error.code === "23505") {
      return res.status(409).json({ error: "A collection with this name already exists" });
    }
    res.status(500).json({
      error: "Failed to create collection",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Delete collection
 */
export async function deleteCollection(req: Request, res: Response) {
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
}

/**
 * Add addresses to collection
 */
export async function addAddressesToCollection(req: Request, res: Response) {
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
      invalidAddresses: invalidAddresses.slice(0, 10),
    });
  } catch (error) {
    console.error("Error adding addresses:", error);
    res.status(500).json({
      error: "Failed to add addresses",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Upload file to collection
 */
export async function uploadFileToCollection(req: Request, res: Response) {
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

/**
 * Remove address from collection
 */
export async function removeAddressFromCollection(req: Request, res: Response) {
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
}

/**
 * Download collection as CSV
 */
export async function downloadCollection(req: Request, res: Response) {
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
}

/**
 * Wallet screener - batch process
 */
export async function screenWalletsBatch(req: Request, res: Response) {
  try {
    const { addresses, chainId = 1 } = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ error: "Addresses array is required" });
    }

    if (addresses.length > 50) {
      return res.status(400).json({ error: "Maximum 50 addresses per batch" });
    }

    // Implementation placeholder - full implementation would go here
    const results = addresses.map(address => ({
      address: address.toLowerCase(),
      riskScore: 0,
      riskLevel: "low" as const,
      labels: ["Placeholder"],
      flags: {
        isBot: false,
        isSybil: false,
        isContract: false,
        isExchange: false,
        isNewWallet: false,
        lowActivity: false,
        highFrequencyTrader: false,
        airdropFarmer: false,
      },
      metrics: {
        txCount: 0,
        firstTxDate: null,
        lastTxDate: null,
        walletAgeDays: 0,
        avgTxPerDay: 0,
        uniqueContractsInteracted: 0,
        totalGasSpent: "0",
        nftCollectionsHeld: 0,
      },
      details: "Screener implementation pending",
    }));

    res.json(results);
  } catch (error) {
    console.error("Error screening wallets:", error);
    res.status(500).json({
      error: "Failed to screen wallets",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Get screener status
 */
export async function getScreenerStatus(req: Request, res: Response) {
  const hasApiKey = !!process.env.ETHERSCAN_API_KEY;
  res.json({
    hasEtherscanApiKey: hasApiKey,
    supportedChains: [
      { id: 1, name: "Ethereum" },
      { id: 10, name: "Optimism" },
      { id: 56, name: "BSC" },
      { id: 137, name: "Polygon" },
      { id: 8453, name: "Base" },
      { id: 42161, name: "Arbitrum" },
    ],
    maxBatchSize: 50,
  });
}
