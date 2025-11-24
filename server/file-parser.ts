import * as XLSX from "xlsx";
import type { Address } from "@shared/schema";
import { validateAddressWithDetails } from "@shared/ethereum";

interface ParseResult {
  addresses: Address[];
  invalidCount: number;
  validationErrors: Array<{ address: string; error: string; line?: number }>;
}

/**
 * Parse CSV/TXT content with multi-line entries
 */
function parseCSVContent(content: string): ParseResult {
  const addresses: Address[] = [];
  const validationErrors: Array<{ address: string; error: string; line?: number }> = [];
  const seenAddresses = new Set<string>();
  let invalidCount = 0;
  
  const lines = content.split(/\r?\n/);
  let currentEntry: string[] = [];
  let currentLineStart = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    const addressMatch = line.match(/^0x[a-zA-Z0-9]+/);
    if (addressMatch) {
      if (currentEntry.length > 0) {
        const parsed = parseEntry(currentEntry.join('\n'));
        if (parsed) {
          if (!seenAddresses.has(parsed.address.toLowerCase())) {
            addresses.push(parsed);
            seenAddresses.add(parsed.address.toLowerCase());
          }
        } else {
          invalidCount++;
          const rawAddr = currentEntry[0].match(/^0x[a-zA-Z0-9]+/)?.[0] || currentEntry[0];
          validationErrors.push({
            address: rawAddr,
            error: 'Invalid Ethereum address format',
            line: currentLineStart + 1,
          });
        }
      }
      currentEntry = [line];
      currentLineStart = i;
    } else if (line) {
      if (currentEntry.length > 0) {
        currentEntry.push(line);
      }
    }
  }
  
  if (currentEntry.length > 0) {
    const parsed = parseEntry(currentEntry.join('\n'));
    if (parsed) {
      if (!seenAddresses.has(parsed.address.toLowerCase())) {
        addresses.push(parsed);
        seenAddresses.add(parsed.address.toLowerCase());
      }
    } else {
      invalidCount++;
      const rawAddr = currentEntry[0].match(/^0x[a-zA-Z0-9]+/)?.[0] || currentEntry[0];
      validationErrors.push({
        address: rawAddr,
        error: 'Invalid Ethereum address format',
        line: currentLineStart + 1,
      });
    }
  }
  
  return { addresses, invalidCount, validationErrors };
}

function parseEntry(entryText: string): Address | null {
  const addressMatch = entryText.match(/0x[a-fA-F0-9]{40}/);
  if (!addressMatch) return null;
  
  const rawAddress = addressMatch[0].trim();
  const validation = validateAddressWithDetails(rawAddress);
  if (!validation.isValid) {
    return null;
  }
  
  const address = validation.normalized || rawAddress;
  const usernameMatch = entryText.match(/@(\w+)/);
  const username = usernameMatch ? usernameMatch[1] : undefined;
  const pointsMatch = entryText.match(/([\d,]+)\s*pts/);
  const points = pointsMatch ? parseFloat(pointsMatch[1].replace(/,/g, '')) : undefined;
  const rankMatch = entryText.match(/#(\d+)/);
  const rank = rankMatch ? parseInt(rankMatch[1]) : undefined;
  
  return { address, username, points, rank };
}

/**
 * Parse JSON content - expects array of address objects or plain address strings
 */
function parseJSONContent(content: string): ParseResult {
  const addresses: Address[] = [];
  const validationErrors: Array<{ address: string; error: string }> = [];
  const seenAddresses = new Set<string>();
  let invalidCount = 0;

  try {
    const data = JSON.parse(content);
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      let address: string;
      let username: string | undefined;
      let points: number | undefined;
      let rank: number | undefined;

      if (typeof item === 'string') {
        address = item;
      } else if (typeof item === 'object' && item !== null) {
        address = item.address || item.wallet || item.walletAddress || '';
        username = item.username || item.user || item.name;
        points = item.points || item.score;
        rank = item.rank || item.position;
      } else {
        continue;
      }

      const validation = validateAddressWithDetails(address);
      if (!validation.isValid) {
        invalidCount++;
        validationErrors.push({
          address: address || 'unknown',
          error: validation.error || 'Invalid address',
        });
        continue;
      }

      const normalized = validation.normalized || address;
      if (!seenAddresses.has(normalized.toLowerCase())) {
        addresses.push({ address: normalized, username, points, rank });
        seenAddresses.add(normalized.toLowerCase());
      }
    }
  } catch (error) {
    throw new Error('Invalid JSON format');
  }

  return { addresses, invalidCount, validationErrors };
}

/**
 * Parse Excel content (.xlsx, .xls)
 */
function parseExcelContent(buffer: Buffer): ParseResult {
  const addresses: Address[] = [];
  const validationErrors: Array<{ address: string; error: string; line?: number }> = [];
  const seenAddresses = new Set<string>();
  let invalidCount = 0;

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet);

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Try to find address in various column names
      const address = row.address || row.Address || row.wallet || row.Wallet || 
                     row.walletAddress || row.WalletAddress || Object.values(row)[0];
      
      if (typeof address !== 'string') continue;

      const validation = validateAddressWithDetails(address);
      if (!validation.isValid) {
        invalidCount++;
        validationErrors.push({
          address,
          error: validation.error || 'Invalid address',
          line: i + 2, // +2 because Excel is 1-indexed and first row is header
        });
        continue;
      }

      const normalized = validation.normalized || address;
      if (!seenAddresses.has(normalized.toLowerCase())) {
        addresses.push({
          address: normalized,
          username: row.username || row.Username || row.user || row.User,
          points: row.points || row.Points || row.score || row.Score,
          rank: row.rank || row.Rank || row.position || row.Position,
        });
        seenAddresses.add(normalized.toLowerCase());
      }
    }
  } catch (error) {
    throw new Error('Invalid Excel format');
  }

  return { addresses, invalidCount, validationErrors };
}

/**
 * Auto-detect file type and parse accordingly
 */
export function parseFile(filename: string, buffer: Buffer): ParseResult {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'json') {
    return parseJSONContent(buffer.toString('utf-8'));
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseExcelContent(buffer);
  } else {
    // Default to CSV/TXT parsing
    return parseCSVContent(buffer.toString('utf-8'));
  }
}
