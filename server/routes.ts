import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import Papa from "papaparse";
import type { Address, ComparisonResult } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

function parseCSVContent(content: string): Address[] {
  const addresses: Address[] = [];
  const seenAddresses = new Set<string>();
  
  // Split into lines and process
  const lines = content.split(/\r?\n/);
  
  // Group lines into entries (each entry starts with an address or is separated by blank lines)
  let currentEntry: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // If we find an address, start a new entry
    // More flexible to handle test/placeholder addresses
    const addressMatch = line.match(/0x[a-zA-Z0-9]{40,42}/);
    if (addressMatch) {
      // Process previous entry if it exists
      if (currentEntry.length > 0) {
        const parsed = parseEntry(currentEntry.join('\n'));
        if (parsed && !seenAddresses.has(parsed.address.toLowerCase())) {
          addresses.push(parsed);
          seenAddresses.add(parsed.address.toLowerCase());
        }
      }
      // Start new entry
      currentEntry = [line];
    } else if (line) {
      // Non-empty, non-address line - add to current entry
      if (currentEntry.length > 0) {
        currentEntry.push(line);
      }
    }
    // Ignore blank lines - they don't end entries
  }
  
  // Process last entry
  if (currentEntry.length > 0) {
    const parsed = parseEntry(currentEntry.join('\n'));
    if (parsed && !seenAddresses.has(parsed.address.toLowerCase())) {
      addresses.push(parsed);
      seenAddresses.add(parsed.address.toLowerCase());
    }
  }
  
  return addresses;
}

function parseEntry(entryText: string): Address | null {
  // Extract Ethereum-like address (0x followed by characters)
  // More flexible to handle test/placeholder addresses
  const addressMatch = entryText.match(/0x[a-zA-Z0-9]{40,42}/);
  if (!addressMatch) return null;
  
  const address = addressMatch[0].trim();
  
  // Extract username (starts with @)
  const usernameMatch = entryText.match(/@(\w+)/);
  const username = usernameMatch ? usernameMatch[1] : undefined;
  
  // Extract points (number followed by 'pts')
  const pointsMatch = entryText.match(/([\d,]+)\s*pts/);
  const points = pointsMatch 
    ? parseFloat(pointsMatch[1].replace(/,/g, '')) 
    : undefined;
  
  // Extract rank (starts with #)
  const rankMatch = entryText.match(/#(\d+)/);
  const rank = rankMatch ? parseInt(rankMatch[1]) : undefined;
  
  return {
    address,
    username,
    points,
    rank,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
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

        const mintedContent = files.minted[0].buffer.toString('utf-8');
        const eligibleContent = files.eligible[0].buffer.toString('utf-8');
        
        const mintedAddresses = parseCSVContent(mintedContent);
        const eligibleAddresses = parseCSVContent(eligibleContent);

        // Create a Set of minted addresses for fast lookup (case-insensitive)
        const mintedSet = new Set(
          mintedAddresses.map(addr => addr.address.toLowerCase())
        );

        // Filter eligible addresses that are NOT in the minted set
        const notMinted = eligibleAddresses.filter(
          addr => !mintedSet.has(addr.address.toLowerCase())
        );

        const result: ComparisonResult = {
          notMinted,
          stats: {
            totalEligible: eligibleAddresses.length,
            totalMinted: mintedAddresses.length,
            remaining: notMinted.length,
          },
        };

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
