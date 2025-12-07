import { BaseService } from '../../core/base-service';
import { Router } from 'express';
import logger, { logServiceInit } from '../../core/logger';
import multer from 'multer';
import { 
  extractAddresses,
  getComparisons,
  getComparison,
  compareFiles,
  compareWithCollection,
  getCollections,
  getCollection,
  createCollection,
  deleteCollection,
  addAddressesToCollection,
  uploadFileToCollection,
  removeAddressFromCollection,
  downloadCollection,
  extractFromTweets,
  screenWalletsBatch,
  getScreenerStatus
} from './controllers';
import {
  validateCollectionId,
  validateComparisonId,
  validateAddressParam,
  validateLimitQuery,
  validateCreateCollection,
  validateAddAddresses,
  validateCompareWithCollection,
  validateTweetUrl,
  validateScreenWallets,
  validateFileUpload,
  validateMultipleFileUpload,
  validateCompareFilesUpload,
  validateFileTypes,
  validateFileSize,
  WEB3_FILE_TYPES,
  MAX_FILE_SIZE_MB,
} from './validators';
import { requireRole } from '../../auth';

// Multer configuration for file uploads
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Web3 Service
 * Handles blockchain address extraction, comparison, collection management, and wallet screening
 */
export class Web3Service extends BaseService {
  private router: Router;

  constructor() {
    super('Web3Service');
    this.router = Router();
    this.setupRoutes();
  }

  /**
   * Setup all Web3 routes with validation
   */
  private setupRoutes(): void {
    // All Web3 routes require web3 role
    this.router.use(requireRole('web3'));

    // Comparison History Routes
    this.router.get('/comparisons', validateLimitQuery, getComparisons);
    this.router.get('/comparisons/:id', validateComparisonId, getComparison);
    this.router.post(
      '/compare',
      upload.fields([{ name: 'minted', maxCount: 1 }, { name: 'eligible', maxCount: 1 }]),
      validateCompareFilesUpload,
      validateFileTypes(WEB3_FILE_TYPES),
      validateFileSize(MAX_FILE_SIZE_MB),
      compareFiles
    );
    this.router.post(
      '/compare-collection',
      upload.single('file'),
      validateFileUpload,
      validateCompareWithCollection,
      validateFileTypes(WEB3_FILE_TYPES),
      validateFileSize(MAX_FILE_SIZE_MB),
      compareWithCollection
    );

    // Address Extraction Routes
    this.router.post(
      '/extract',
      upload.array('files', 100),
      validateMultipleFileUpload,
      validateFileTypes(WEB3_FILE_TYPES),
      validateFileSize(MAX_FILE_SIZE_MB),
      extractAddresses
    );
    this.router.post('/extract-tweets', validateTweetUrl, extractFromTweets);

    // Collection Management Routes
    this.router.get('/collections', getCollections);
    this.router.get('/collections/:id', validateCollectionId, getCollection);
    this.router.post('/collections', validateCreateCollection, createCollection);
    this.router.delete('/collections/:id', validateCollectionId, deleteCollection);
    this.router.post('/collections/:id/addresses', validateAddAddresses, addAddressesToCollection);
    this.router.post(
      '/collections/:id/upload',
      upload.single('file'),
      validateCollectionId,
      validateFileUpload,
      validateFileTypes(WEB3_FILE_TYPES),
      validateFileSize(MAX_FILE_SIZE_MB),
      uploadFileToCollection
    );
    this.router.delete(
      '/collections/:id/addresses/:address',
      validateCollectionId,
      validateAddressParam,
      removeAddressFromCollection
    );
    this.router.get('/collections/:id/download', validateCollectionId, downloadCollection);

    // Wallet Screener Routes
    this.router.post('/wallet-screener/batch', validateScreenWallets, screenWalletsBatch);
    this.router.get('/wallet-screener/status', getScreenerStatus);

    logger.info('Web3 routes registered with validation');
  }

  /**
   * Get the Express router for this service
   */
  getRoutes(): Router {
    return this.router;
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    logger.info('Web3 service initializing...');
    // Add any initialization logic here (e.g., connecting to blockchain nodes)
    logServiceInit(this.serviceName);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Add actual health checks here (e.g., check blockchain node connectivity)
      return true;
    } catch (error) {
      logger.error('Web3 service health check failed', { error });
      return false;
    }
  }
}

// Export singleton instance
export const web3Service = new Web3Service();
