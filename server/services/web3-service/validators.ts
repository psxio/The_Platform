import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check validation results
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((err: any) => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg,
      })),
    });
  }
  next();
}

/**
 * Validate Ethereum address format
 */
function isEthereumAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Validate collection ID parameter
 */
export const validateCollectionId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Collection ID must be a positive integer'),
  handleValidationErrors,
];

/**
 * Validate comparison ID parameter
 */
export const validateComparisonId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Comparison ID must be a positive integer'),
  handleValidationErrors,
];

/**
 * Validate address parameter
 */
export const validateAddressParam = [
  param('address')
    .custom(isEthereumAddress)
    .withMessage('Invalid Ethereum address format'),
  handleValidationErrors,
];

/**
 * Validate limit query parameter
 */
export const validateLimitQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  handleValidationErrors,
];

/**
 * Validate create collection request
 */
export const validateCreateCollection = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Collection name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Collection name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  handleValidationErrors,
];

/**
 * Validate add addresses to collection request
 */
export const validateAddAddresses = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Collection ID must be a positive integer'),
  body('addresses')
    .isArray({ min: 1 })
    .withMessage('Addresses must be a non-empty array'),
  body('addresses.*')
    .isString()
    .withMessage('Each address must be a string'),
  handleValidationErrors,
];

/**
 * Validate compare with collection request
 */
export const validateCompareWithCollection = [
  body('collectionId')
    .isInt({ min: 1 })
    .withMessage('Collection ID must be a positive integer'),
  handleValidationErrors,
];

/**
 * Validate tweet URL
 */
export const validateTweetUrl = [
  body('tweetUrl')
    .notEmpty()
    .withMessage('Tweet URL is required')
    .isURL()
    .withMessage('Invalid URL format')
    .matches(/twitter\.com\/.*\/status\/\d+|x\.com\/.*\/status\/\d+/)
    .withMessage('URL must be a valid Twitter/X status URL'),
  handleValidationErrors,
];

/**
 * Validate wallet screening batch request
 */
export const validateScreenWallets = [
  body('addresses')
    .isArray({ min: 1, max: 50 })
    .withMessage('Addresses must be an array with 1-50 items'),
  body('addresses.*')
    .custom(isEthereumAddress)
    .withMessage('Each address must be a valid Ethereum address'),
  body('chainId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Chain ID must be a positive integer'),
  handleValidationErrors,
];

/**
 * Validate file upload (used with multer)
 */
export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  if (!req.file && !req.files) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [{ message: 'File upload is required' }],
    });
  }
  next();
}

/**
 * Validate multiple file uploads
 */
export function validateMultipleFileUpload(req: Request, res: Response, next: NextFunction) {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [{ message: 'At least one file is required' }],
    });
  }
  next();
}

/**
 * Validate compare files upload (requires both minted and eligible files)
 */
export function validateCompareFilesUpload(req: Request, res: Response, next: NextFunction) {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  if (!files || !files.minted || !files.eligible) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [{ message: 'Both minted and eligible files are required' }],
    });
  }
  
  if (files.minted.length === 0 || files.eligible.length === 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [{ message: 'Both minted and eligible files must contain at least one file' }],
    });
  }
  
  next();
}

/**
 * Validate supported file types
 */
export function validateFileTypes(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = (req.file ? [req.file] : req.files) as Express.Multer.File[] | Express.Multer.File[][];
    
    if (!files || (Array.isArray(files) && files.length === 0)) {
      return next();
    }
    
    const invalidFiles: string[] = [];
    const fileArray = Array.isArray(files) ? files : Object.values(files).flat();
    
    for (const file of fileArray) {
      if (file && typeof file === 'object' && 'originalname' in file) {
        const multerFile = file as Express.Multer.File;
        const ext = multerFile.originalname.toLowerCase().split('.').pop() || '';
        if (!allowedTypes.includes(ext)) {
          invalidFiles.push(multerFile.originalname);
        }
      }
    }
    
    if (invalidFiles.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{
          message: `Unsupported file type(s). Allowed: ${allowedTypes.join(', ')}`,
          files: invalidFiles,
        }],
      });
    }
    
    next();
  };
}

/**
 * Validate file size
 */
export function validateFileSize(maxSizeMB: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = (req.file ? [req.file] : req.files) as Express.Multer.File[] | Express.Multer.File[][];
    
    if (!files || (Array.isArray(files) && files.length === 0)) {
      return next();
    }
    
    const maxBytes = maxSizeMB * 1024 * 1024;
    const oversizedFiles: string[] = [];
    const fileArray = Array.isArray(files) ? files : Object.values(files).flat();
    
    for (const file of fileArray) {
      if (file && typeof file === 'object' && 'size' in file && 'originalname' in file) {
        const multerFile = file as Express.Multer.File;
        if (multerFile.size > maxBytes) {
          oversizedFiles.push(`${multerFile.originalname} (${(multerFile.size / 1024 / 1024).toFixed(2)}MB)`);
        }
      }
    }
    
    if (oversizedFiles.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{
          message: `File(s) exceed maximum size of ${maxSizeMB}MB`,
          files: oversizedFiles,
        }],
      });
    }
    
    next();
  };
}

// Common file type sets
export const WEB3_FILE_TYPES = ['csv', 'txt', 'json', 'xlsx', 'xls', 'pdf'];
export const MAX_FILE_SIZE_MB = 50;
