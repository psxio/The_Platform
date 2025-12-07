import { Request, Response, NextFunction } from 'express';

/**
 * Validate filename parameter
 */
export function validateFilename(req: Request, res: Response, next: NextFunction) {
  const { filename } = req.params;
  
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }
  
  // Security: Prevent path traversal attacks
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename: path traversal not allowed' });
  }
  
  // Check for valid filename characters
  const validFilenameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!validFilenameRegex.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename: contains illegal characters' });
  }
  
  next();
}

/**
 * Validate file upload
 */
export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: 'File is required' });
  }
  
  // Validate file size (50MB max)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return res.status(400).json({ 
      error: 'File too large',
      maxSizeMB: 50,
      fileSizeMB: (file.size / (1024 * 1024)).toFixed(2)
    });
  }
  
  // Validate filename
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename: path traversal not allowed' });
  }
  
  next();
}

/**
 * Validate multiple file upload
 */
export function validateMultipleFileUpload(req: Request, res: Response, next: NextFunction) {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'At least one file is required' });
  }
  
  // Check max files limit
  if (files.length > 100) {
    return res.status(400).json({ 
      error: 'Too many files',
      maxFiles: 100,
      filesCount: files.length
    });
  }
  
  // Validate each file
  const maxSize = 50 * 1024 * 1024;
  for (const file of files) {
    if (file.size > maxSize) {
      return res.status(400).json({ 
        error: `File "${file.originalname}" is too large`,
        maxSizeMB: 50,
        fileSizeMB: (file.size / (1024 * 1024)).toFixed(2)
      });
    }
    
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      return res.status(400).json({ 
        error: `Invalid filename: "${file.originalname}" contains illegal path characters` 
      });
    }
  }
  
  next();
}

/**
 * Validate query parameters for file listing
 */
export function validateFileListQuery(req: Request, res: Response, next: NextFunction) {
  const { limit, offset } = req.query;
  
  if (limit && isNaN(Number(limit))) {
    return res.status(400).json({ error: 'Invalid limit parameter' });
  }
  
  if (offset && isNaN(Number(offset))) {
    return res.status(400).json({ error: 'Invalid offset parameter' });
  }
  
  // Set reasonable limits
  if (limit && Number(limit) > 1000) {
    return res.status(400).json({ error: 'Limit cannot exceed 1000' });
  }
  
  next();
}
