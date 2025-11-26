import { google, sheets_v4 } from "googleapis";
import type { ContentTask, InsertContentTask } from "@shared/schema";

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

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null;
  private spreadsheetId: string | null = null;
  private sheetName: string = "Tasks";

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
      
      // Test connection by getting spreadsheet info
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      console.log("Google Sheets integration initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize Google Sheets:", error);
      this.sheets = null;
      return false;
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
}

export const googleSheetsService = new GoogleSheetsService();
