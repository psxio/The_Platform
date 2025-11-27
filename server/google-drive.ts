import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getGoogleDriveAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: SCOPES,
    });
    return auth;
  } catch (error) {
    console.error('Failed to initialize Google Drive auth:', error);
    return null;
  }
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
  webContentLink?: string;
}

export async function uploadToGoogleDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<DriveUploadResult | null> {
  const auth = getGoogleDriveAuth();
  
  if (!auth) {
    console.log('Google Drive not configured - using local storage fallback');
    return null;
  }

  try {
    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    const { Readable } = await import('stream');
    const stream = Readable.from(buffer);

    const fileMetadata: any = {
      name: fileName,
    };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, webViewLink, webContentLink',
    });

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error('Failed to get file ID from upload response');
    }

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const fileData = await drive.files.get({
      fileId,
      fields: 'webViewLink, webContentLink',
    });

    return {
      fileId,
      webViewLink: fileData.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      webContentLink: fileData.data.webContentLink || undefined,
    };
  } catch (error) {
    console.error('Google Drive upload error:', error);
    return null;
  }
}

export async function isGoogleDriveConfigured(): Promise<boolean> {
  return !!getGoogleDriveAuth();
}
