import { google, sheets_v4, drive_v3 } from "googleapis";
import type { ContentTask, InsertContentTask, DirectoryMember } from "@shared/schema";
import { Readable } from "stream";

export interface SheetRow {
  description: string;
  status: string;
  assignedTo?: string;
  dueDate?: string;
  assignedBy?: string;
  client?: string;
  deliverable?: string;
  notes?: string;
}

export interface DirectorySheetRow {
  person: string;
  skill?: string;
  evmAddress?: string;
  client?: string;
}

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file"
];

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null;
  private drive: drive_v3.Drive | null = null;
  private spreadsheetId: string | null = null;
  private sheetName: string = "TASKS";
  private directorySheetName: string = "DIRECTORY";
  private driveFolderId: string | null = null; // Optional: folder to store files

  async initialize(): Promise<boolean> {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || null;

    if (!clientEmail || !privateKey || !this.spreadsheetId) {
      console.log("Google Sheets integration not configured - missing credentials");
      return false;
    }

    // Handle various private key formats
    // Replace literal \n with actual newlines
    privateKey = privateKey.replace(/\\n/g, "\n");
    // Handle double-escaped newlines
    privateKey = privateKey.replace(/\\\\n/g, "\n");
    
    // Extract and clean the base64 content
    // Remove any headers, whitespace, and stray characters
    let cleanKey = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, "")
      .replace(/-----END PRIVATE KEY-----/g, "")
      .replace(/\s/g, ""); // Remove all whitespace including newlines
    
    // Remove leading 'n' characters that might be artifacts from \n parsing issues
    while (cleanKey.startsWith("n") && !cleanKey.startsWith("MIIE") && !cleanKey.startsWith("MII")) {
      cleanKey = cleanKey.substring(1);
    }
    
    // Also remove trailing 'n' characters
    while (cleanKey.endsWith("n") && cleanKey.length > 10) {
      cleanKey = cleanKey.substring(0, cleanKey.length - 1);
    }
    
    // Validate that the key looks like base64 (starts with MII for PKCS#8 private key)
    if (!cleanKey.startsWith("MII")) {
      console.error("Private key doesn't appear to be valid PKCS#8 format. Expected to start with 'MII', got:", cleanKey.substring(0, 10));
    }
    
    // Format the key with proper line breaks (64 chars per line for PEM)
    const formattedKey = cleanKey.match(/.{1,64}/g)?.join("\n") || cleanKey;
    
    privateKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----\n`;
    
    console.log("Private key format check:", {
      hasBeginMarker: privateKey.includes("-----BEGIN PRIVATE KEY-----"),
      hasEndMarker: privateKey.includes("-----END PRIVATE KEY-----"),
      hasNewlines: privateKey.includes("\n"),
      length: privateKey.length,
      keyStartsWith: cleanKey.substring(0, 10)
    });

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: SCOPES,
      });

      this.sheets = google.sheets({ version: "v4", auth });
      this.drive = google.drive({ version: "v3", auth });
      
      // Get optional Drive folder ID from env
      this.driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;
      
      // Test connection by getting spreadsheet info
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      console.log("Google Sheets & Drive integration initialized successfully");
      return true;
    } catch (error: any) {
      console.error("Failed to initialize Google Sheets:", error);
      this.sheets = null;
      
      // Provide more specific error messages
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes("API has not been used") || errorMessage.includes("it is disabled")) {
        throw new Error("Google Sheets API is not enabled. Please enable it in Google Cloud Console: https://console.developers.google.com/apis/api/sheets.googleapis.com");
      } else if (errorMessage.includes("permission") || errorMessage.includes("forbidden") || error?.code === 403) {
        throw new Error("Permission denied. Make sure the Google Sheet is shared with the service account email.");
      } else if (errorMessage.includes("not found") || error?.code === 404) {
        throw new Error("Spreadsheet not found. Please check the Sheet ID or URL.");
      } else if (errorMessage.includes("DECODER") || errorMessage.includes("unsupported")) {
        throw new Error("Invalid private key format. Please re-enter your service account private key.");
      }
      
      throw error;
    }
  }

  isConfigured(): boolean {
    return this.sheets !== null && this.spreadsheetId !== null;
  }

  async getSheetData(): Promise<SheetRow[]> {
    if (!this.sheets || !this.spreadsheetId) {
      throw new Error("Google Sheets not initialized");
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A2:H`, // Skip header row
      });

      const rows = response.data.values || [];
      return rows.map((row) => ({
        description: row[0] || "",
        status: row[1] || "TO BE STARTED",
        assignedTo: row[2] || undefined,
        dueDate: row[3] || undefined,
        assignedBy: row[4] || undefined,
        client: row[5] || undefined,
        deliverable: row[6] || undefined,
        notes: row[7] || undefined,
      }));
    } catch (error) {
      console.error("Failed to get sheet data:", error);
      throw error;
    }
  }

  async syncToSheet(tasks: ContentTask[]): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) {
      throw new Error("Google Sheets not initialized");
    }

    try {
      // First, clear existing data (except header)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A2:H`,
      });

      if (tasks.length === 0) {
        return;
      }

      // Write all tasks to sheet
      const values = tasks.map((task) => [
        task.description,
        task.status,
        task.assignedTo || "",
        task.dueDate || "",
        task.assignedBy || "",
        task.client || "",
        task.deliverable || "",
        task.notes || "",
      ]);

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A2`,
        valueInputOption: "RAW",
        requestBody: {
          values,
        },
      });

      console.log(`Synced ${tasks.length} tasks to Google Sheet`);
    } catch (error) {
      console.error("Failed to sync to sheet:", error);
      throw error;
    }
  }

  async appendTask(task: ContentTask): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) {
      throw new Error("Google Sheets not initialized");
    }

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:H`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            task.description,
            task.status,
            task.assignedTo || "",
            task.dueDate || "",
            task.assignedBy || "",
            task.client || "",
            task.deliverable || "",
            task.notes || "",
          ]],
        },
      });
    } catch (error) {
      console.error("Failed to append task to sheet:", error);
      throw error;
    }
  }

  async ensureHeaderRow(): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) {
      throw new Error("Google Sheets not initialized");
    }

    try {
      // Check if header exists
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A1:H1`,
      });

      const headerRow = response.data.values?.[0];
      const expectedHeaders = [
        "Description",
        "Status",
        "Assigned To",
        "Due Date",
        "Assigned By",
        "Client",
        "Deliverable",
        "Notes",
      ];

      if (!headerRow || headerRow.length === 0) {
        // Create header row
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${this.sheetName}!A1:H1`,
          valueInputOption: "RAW",
          requestBody: {
            values: [expectedHeaders],
          },
        });
        console.log("Created header row in Google Sheet");
      }
    } catch (error) {
      console.error("Failed to ensure header row:", error);
    }
  }

  // Directory sync methods
  async ensureDirectorySheet(): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) {
      throw new Error("Google Sheets not initialized");
    }

    try {
      // Get spreadsheet info to check if Directory sheet exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheets = spreadsheet.data.sheets || [];
      const sheetNames = sheets.map((s) => s.properties?.title);
      console.log("Available sheets:", sheetNames);
      
      const directorySheetExists = sheets.some(
        (sheet) => sheet.properties?.title === this.directorySheetName
      );

      if (!directorySheetExists) {
        try {
          // Create the Directory sheet
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: {
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: this.directorySheetName,
                    },
                  },
                },
              ],
            },
          });
          console.log("Created Directory sheet");
        } catch (createError: any) {
          // Handle case where sheet was created by another request
          if (createError?.message?.includes("already exists")) {
            console.log("Directory sheet already exists, continuing...");
          } else {
            throw createError;
          }
        }
      }

      // Ensure header row exists
      await this.ensureDirectoryHeaderRow();
    } catch (error) {
      console.error("Failed to ensure Directory sheet:", error);
      throw error;
    }
  }

  async ensureDirectoryHeaderRow(): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) {
      throw new Error("Google Sheets not initialized");
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.directorySheetName}!A1:D1`,
      });

      const headerRow = response.data.values?.[0];
      const expectedHeaders = ["Person", "Skill", "EVM Address", "Client"];

      if (!headerRow || headerRow.length === 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${this.directorySheetName}!A1:D1`,
          valueInputOption: "RAW",
          requestBody: {
            values: [expectedHeaders],
          },
        });
        console.log("Created Directory header row in Google Sheet");
      }
    } catch (error) {
      console.error("Failed to ensure Directory header row:", error);
    }
  }

  async getDirectoryData(): Promise<DirectorySheetRow[]> {
    if (!this.sheets || !this.spreadsheetId) {
      throw new Error("Google Sheets not initialized");
    }

    try {
      await this.ensureDirectorySheet();

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.directorySheetName}!A2:D`, // Skip header row
      });

      const rows = response.data.values || [];
      return rows.map((row) => ({
        person: row[0] || "",
        skill: row[1] || undefined,
        evmAddress: row[2] || undefined,
        client: row[3] || undefined,
      }));
    } catch (error) {
      console.error("Failed to get directory data:", error);
      throw error;
    }
  }

  async syncDirectoryToSheet(members: DirectoryMember[]): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) {
      throw new Error("Google Sheets not initialized");
    }

    try {
      await this.ensureDirectorySheet();

      // Clear existing data (except header)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${this.directorySheetName}!A2:D`,
      });

      if (members.length === 0) {
        return;
      }

      // Write all members to sheet
      const values = members.map((member) => [
        member.person,
        member.skill || "",
        member.evmAddress || "",
        member.client || "",
      ]);

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.directorySheetName}!A2`,
        valueInputOption: "RAW",
        requestBody: {
          values,
        },
      });

      console.log(`Synced ${members.length} directory members to Google Sheet`);
    } catch (error) {
      console.error("Failed to sync directory to sheet:", error);
      throw error;
    }
  }

  // Google Drive file upload methods
  async uploadToDrive(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    if (!this.drive) {
      throw new Error("Google Drive not initialized");
    }

    try {
      // Convert buffer to readable stream
      const stream = new Readable();
      stream.push(fileBuffer);
      stream.push(null);

      // Prepare file metadata
      const fileMetadata: drive_v3.Schema$File = {
        name: fileName,
      };

      // If a folder ID is configured, upload to that folder
      if (this.driveFolderId) {
        fileMetadata.parents = [this.driveFolderId];
      }

      // Upload the file
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType,
          body: stream,
        },
        fields: "id, webViewLink, webContentLink",
      });

      const fileId = response.data.id;
      if (!fileId) {
        throw new Error("File upload failed - no file ID returned");
      }

      // Make the file publicly accessible (anyone with link can view)
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      // Return the shareable link
      const webViewLink = response.data.webViewLink || 
        `https://drive.google.com/file/d/${fileId}/view`;
      
      console.log(`Uploaded file to Google Drive: ${fileName} -> ${webViewLink}`);
      return webViewLink;
    } catch (error) {
      console.error("Failed to upload file to Google Drive:", error);
      throw error;
    }
  }

  isDriveConfigured(): boolean {
    return this.drive !== null;
  }
  
  // ==================== SHEETS HUB METHODS ====================
  
  // Extract sheet ID from URL or return as-is if already an ID
  extractSheetId(urlOrId: string): string {
    // If it looks like a URL, extract the ID
    const urlMatch = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    // Otherwise assume it's already an ID
    return urlOrId;
  }
  
  // Generic method to read any sheet by ID
  async readSheetValues(sheetId: string, range: string): Promise<string[][]> {
    if (!this.sheets) {
      throw new Error("Google Sheets not initialized - please connect first");
    }
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      });
      return response.data.values || [];
    } catch (error: any) {
      console.error("Failed to read sheet:", error);
      if (error?.code === 403) {
        throw new Error("Permission denied. Make sure the sheet is shared with the service account email.");
      }
      if (error?.code === 404) {
        throw new Error("Spreadsheet not found. Check the Sheet ID or URL.");
      }
      throw error;
    }
  }
  
  // Get sheet metadata (tabs, title, etc.)
  async getSheetMetadata(sheetId: string): Promise<{ title: string; tabs: string[] }> {
    if (!this.sheets) {
      throw new Error("Google Sheets not initialized");
    }
    
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      
      const title = response.data.properties?.title || "Untitled";
      const tabs = (response.data.sheets || []).map(s => s.properties?.title || "Sheet");
      
      return { title, tabs };
    } catch (error: any) {
      console.error("Failed to get sheet metadata:", error);
      if (error?.code === 403) {
        throw new Error("Permission denied. Make sure the sheet is shared with the service account email.");
      }
      if (error?.code === 404) {
        throw new Error("Spreadsheet not found. Check the Sheet ID or URL.");
      }
      throw error;
    }
  }
  
  // Read payroll sheet data - matches the payroll sheet structure
  async readPayrollSheet(sheetId: string, tabName?: string): Promise<{
    entityName: string;
    walletAddress: string | null;
    inflowItem: string | null;
    amountIn: string | null;
    amountOut: string | null;
    tokenType: string | null;
    tokenAddress: string | null;
    receiver: string | null;
    rawAmount: string | null;
    sheetRowId: string | null;
    rowIndex: number;
  }[]> {
    const range = tabName ? `'${tabName}'!A2:J` : "A2:J"; // Skip header row
    const rows = await this.readSheetValues(sheetId, range);
    
    return rows.map((row, idx) => ({
      entityName: row[0] || "Unknown",
      walletAddress: row[1] || null,
      inflowItem: row[2] || null,
      amountIn: row[3] || null,
      amountOut: row[4] || null,
      tokenType: row[5] || null,
      tokenAddress: row[6] || null,
      receiver: row[7] || null,
      rawAmount: row[8] || null,
      sheetRowId: row[9] || null,
      rowIndex: idx + 2, // Account for header row
    }));
  }
  
  // Read multi-column task board - matches the task board structure
  async readMultiColumnTaskSheet(sheetId: string, tabName?: string): Promise<{
    columnName: string;
    taskDescription: string;
    rowIndex: number;
  }[]> {
    // First get the header row to find column names
    const headerRange = tabName ? `'${tabName}'!A1:Z1` : "A1:Z1";
    const headerRows = await this.readSheetValues(sheetId, headerRange);
    const headers = headerRows[0] || [];
    
    // Then get all data rows
    const dataRange = tabName ? `'${tabName}'!A2:Z` : "A2:Z";
    const dataRows = await this.readSheetValues(sheetId, dataRange);
    
    const tasks: { columnName: string; taskDescription: string; rowIndex: number }[] = [];
    
    for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
      const row = dataRows[rowIdx];
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cellValue = row[colIdx]?.trim();
        if (cellValue) {
          const columnName = headers[colIdx] || `Column ${colIdx + 1}`;
          tasks.push({
            columnName,
            taskDescription: cellValue,
            rowIndex: rowIdx + 2, // Account for header row
          });
        }
      }
    }
    
    return tasks;
  }
  
  // Read generic data sheet - returns headers and rows for table display
  async readDataSheet(sheetId: string, tabName?: string): Promise<{
    headers: string[];
    rows: { rowIndex: number; cells: { [column: string]: string } }[];
  }> {
    // Get header row
    const headerRange = tabName ? `'${tabName}'!A1:ZZ1` : "A1:ZZ1";
    const headerRows = await this.readSheetValues(sheetId, headerRange);
    const headers = (headerRows[0] || []).filter(h => h?.trim());
    
    // Get all data rows
    const dataRange = tabName ? `'${tabName}'!A2:ZZ` : "A2:ZZ";
    const dataRows = await this.readSheetValues(sheetId, dataRange);
    
    const rows: { rowIndex: number; cells: { [column: string]: string } }[] = [];
    
    for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
      const row = dataRows[rowIdx];
      // Skip completely empty rows
      if (!row || row.every(cell => !cell?.trim())) continue;
      
      const cells: { [column: string]: string } = {};
      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const header = headers[colIdx] || `Column ${colIdx + 1}`;
        cells[header] = row[colIdx]?.trim() || "";
      }
      
      rows.push({
        rowIndex: rowIdx + 2,
        cells,
      });
    }
    
    return { headers, rows };
  }
  
  // Write value to a specific cell
  async writeSheetCell(sheetId: string, range: string, value: string): Promise<void> {
    if (!this.sheets) {
      throw new Error("Google Sheets not initialized");
    }
    
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range,
        valueInputOption: "RAW",
        requestBody: {
          values: [[value]],
        },
      });
    } catch (error) {
      console.error("Failed to write to sheet:", error);
      throw error;
    }
  }
  
  // Append a row to a sheet
  async appendSheetRow(sheetId: string, range: string, values: string[]): Promise<void> {
    if (!this.sheets) {
      throw new Error("Google Sheets not initialized");
    }
    
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range,
        valueInputOption: "RAW",
        requestBody: {
          values: [values],
        },
      });
    } catch (error) {
      console.error("Failed to append to sheet:", error);
      throw error;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
