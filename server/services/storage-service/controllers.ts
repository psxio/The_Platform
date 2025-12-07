import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 100 // Max 100 files per upload
  }
});

/**
 * Multer middleware exports for route configuration
 */
export const uploadSingle = upload.single('file');
export const uploadArray = upload.array('files', 100);
export const uploadFields = upload.fields([
  { name: 'minted', maxCount: 1 },
  { name: 'eligible', maxCount: 1 }
]);

/**
 * Upload a single file to local storage or Google Drive
 */
export async function uploadFile(req: Request, res: Response) {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    // Save to local uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueName = `${Date.now()}-${file.originalname}`;
    const localPath = path.join(uploadsDir, uniqueName);
    fs.writeFileSync(localPath, file.buffer);

    res.json({
      success: true,
      filename: file.originalname,
      path: `/uploads/${uniqueName}`,
      size: file.size,
      mimetype: file.mimetype
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      error: 'Failed to upload file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(req: Request, res: Response) {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required' });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      const localPath = path.join(uploadsDir, uniqueName);
      fs.writeFileSync(localPath, file.buffer);

      uploadedFiles.push({
        filename: file.originalname,
        path: `/uploads/${uniqueName}`,
        size: file.size,
        mimetype: file.mimetype
      });
    }

    res.json({
      success: true,
      filesUploaded: uploadedFiles.length,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ 
      error: 'Failed to upload files',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Download a file from local storage
 */
export async function downloadFile(req: Request, res: Response) {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ 
      error: 'Failed to download file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Delete a file from local storage
 */
export async function deleteFile(req: Request, res: Response) {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get file information
 */
export async function getFileInfo(req: Request, res: Response) {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(filePath);

    res.json({
      filename,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      path: `/uploads/${filename}`
    });
  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({ 
      error: 'Failed to get file info',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * List all files in uploads directory
 */
export async function listFiles(req: Request, res: Response) {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ files: [] });
    }

    const files = fs.readdirSync(uploadsDir);
    const fileInfos = files.map(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        path: `/uploads/${filename}`
      };
    });

    res.json({ files: fileInfos });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ 
      error: 'Failed to list files',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Check storage health and capacity
 */
export async function getStorageInfo(req: Request, res: Response) {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const files = fs.readdirSync(uploadsDir);
    let totalSize = 0;

    files.forEach(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });

    res.json({
      uploadsDirectory: uploadsDir,
      fileCount: files.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      maxFileSize: 50 * 1024 * 1024,
      maxFileSizeMB: 50
    });
  } catch (error) {
    console.error('Error getting storage info:', error);
    res.status(500).json({ 
      error: 'Failed to get storage info',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
