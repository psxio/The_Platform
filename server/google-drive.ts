import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
];

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

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
  isFolder: boolean;
}

export interface DriveFolder {
  id: string;
  name: string;
  path: string[];
  files: DriveFile[];
  subfolders: DriveFolder[];
}

export interface ContentTeamFolder {
  memberName: string;
  folderId: string;
  clientFolder?: DriveFolder;
  internalFolder?: DriveFolder;
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

export async function listFilesInFolder(folderId: string): Promise<DriveFile[]> {
  const auth = getGoogleDriveAuth();
  
  if (!auth) {
    console.log('Google Drive not configured');
    return [];
  }

  try {
    const drive = google.drive({ version: 'v3', auth });
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink, iconLink, size, createdTime, modifiedTime, parents)',
      orderBy: 'name',
      pageSize: 1000,
    });

    const files = response.data.files || [];
    
    return files.map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
      thumbnailLink: file.thumbnailLink,
      iconLink: file.iconLink,
      size: file.size,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      parents: file.parents,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    }));
  } catch (error) {
    console.error('Google Drive list files error:', error);
    return [];
  }
}

export async function getFolderContents(folderId: string, folderName: string = '', path: string[] = []): Promise<DriveFolder> {
  const files = await listFilesInFolder(folderId);
  
  const regularFiles = files.filter(f => !f.isFolder);
  const subfolderFiles = files.filter(f => f.isFolder);
  
  const subfolders: DriveFolder[] = [];
  for (const subfolder of subfolderFiles) {
    const subfolderContents = await getFolderContents(
      subfolder.id, 
      subfolder.name, 
      [...path, folderName].filter(Boolean)
    );
    subfolders.push(subfolderContents);
  }
  
  return {
    id: folderId,
    name: folderName,
    path,
    files: regularFiles,
    subfolders,
  };
}

export async function getContentTeamFolders(): Promise<ContentTeamFolder[]> {
  const contentFolderId = process.env.GOOGLE_DRIVE_CONTENT_FOLDER_ID;
  
  if (!contentFolderId) {
    console.log('Content team folder ID not configured');
    return [];
  }

  try {
    const memberFolders = await listFilesInFolder(contentFolderId);
    const teamFolders: ContentTeamFolder[] = [];

    for (const memberFolder of memberFolders.filter(f => f.isFolder)) {
      const subfolders = await listFilesInFolder(memberFolder.id);
      
      const clientFolder = subfolders.find(f => f.isFolder && f.name.toLowerCase() === 'client');
      const internalFolder = subfolders.find(f => f.isFolder && f.name.toLowerCase() === 'internal');
      
      const teamFolder: ContentTeamFolder = {
        memberName: memberFolder.name,
        folderId: memberFolder.id,
      };

      if (clientFolder) {
        teamFolder.clientFolder = await getFolderContents(clientFolder.id, 'client', [memberFolder.name]);
      }

      if (internalFolder) {
        teamFolder.internalFolder = await getFolderContents(internalFolder.id, 'internal', [memberFolder.name]);
      }

      teamFolders.push(teamFolder);
    }

    return teamFolders;
  } catch (error) {
    console.error('Failed to get content team folders:', error);
    return [];
  }
}

export async function getFileDetails(fileId: string): Promise<DriveFile | null> {
  const auth = getGoogleDriveAuth();
  
  if (!auth) {
    return null;
  }

  try {
    const drive = google.drive({ version: 'v3', auth });
    
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, webViewLink, webContentLink, thumbnailLink, iconLink, size, createdTime, modifiedTime, parents',
    });

    const file = response.data;
    
    return {
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      webViewLink: file.webViewLink || undefined,
      webContentLink: file.webContentLink || undefined,
      thumbnailLink: file.thumbnailLink || undefined,
      iconLink: file.iconLink || undefined,
      size: file.size || undefined,
      createdTime: file.createdTime || undefined,
      modifiedTime: file.modifiedTime || undefined,
      parents: file.parents || undefined,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    };
  } catch (error) {
    console.error('Google Drive get file error:', error);
    return null;
  }
}

export async function getFolderBreadcrumb(folderId: string): Promise<{ id: string; name: string }[]> {
  const auth = getGoogleDriveAuth();
  
  if (!auth) {
    return [];
  }

  try {
    const drive = google.drive({ version: 'v3', auth });
    const breadcrumb: { id: string; name: string }[] = [];
    let currentId = folderId;
    const contentFolderId = process.env.GOOGLE_DRIVE_CONTENT_FOLDER_ID;

    while (currentId && currentId !== contentFolderId) {
      const response = await drive.files.get({
        fileId: currentId,
        fields: 'id, name, parents',
      });

      breadcrumb.unshift({
        id: response.data.id!,
        name: response.data.name!,
      });

      currentId = response.data.parents?.[0] || '';
    }

    return breadcrumb;
  } catch (error) {
    console.error('Google Drive breadcrumb error:', error);
    return [];
  }
}

export async function uploadToMemberFolder(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  memberName: string,
  folderType: 'client' | 'internal'
): Promise<DriveUploadResult | null> {
  const auth = getGoogleDriveAuth();
  
  if (!auth) {
    console.log('Google Drive not configured');
    return null;
  }

  try {
    const contentFolderId = process.env.GOOGLE_DRIVE_CONTENT_FOLDER_ID;
    if (!contentFolderId) {
      throw new Error('Content folder not configured');
    }

    const memberFolders = await listFilesInFolder(contentFolderId);
    const memberFolder = memberFolders.find(
      f => f.isFolder && f.name.toLowerCase() === memberName.toLowerCase()
    );

    if (!memberFolder) {
      throw new Error(`Member folder '${memberName}' not found`);
    }

    const subfolders = await listFilesInFolder(memberFolder.id);
    const targetFolder = subfolders.find(
      f => f.isFolder && f.name.toLowerCase() === folderType
    );

    if (!targetFolder) {
      throw new Error(`${folderType} folder not found for ${memberName}`);
    }

    const drive = google.drive({ version: 'v3', auth });
    const { Readable } = await import('stream');
    const stream = Readable.from(buffer);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [targetFolder.id],
      },
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

    return {
      fileId,
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      webContentLink: response.data.webContentLink || undefined,
    };
  } catch (error) {
    console.error('Google Drive upload to member folder error:', error);
    return null;
  }
}
