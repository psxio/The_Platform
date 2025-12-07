import { Router } from 'express';
import { BaseService } from '../../core/base-service';
import logger, { logServiceInit } from '../../core/logger';
import * as controllers from './controllers';
import * as validators from './validators';

/**
 * Storage Service - Manages file upload/download operations
 * 
 * Endpoints:
 * - POST   /upload           - Upload a single file
 * - POST   /upload-multiple  - Upload multiple files
 * - GET    /:filename        - Download a file
 * - DELETE /:filename        - Delete a file
 * - GET    /:filename/info   - Get file information
 * - GET    /list             - List all files
 * - GET    /info             - Get storage information
 */
export class StorageServiceAPI extends BaseService {
  private router: Router;

  constructor() {
    super('StorageService');
    this.router = Router();
    this.setupRoutes();
  }

  /**
   * Setup all Storage service routes
   */
  private setupRoutes(): void {
    // POST /api/v1/storage/upload - Upload single file
    this.router.post(
      '/upload',
      controllers.uploadSingle,
      validators.validateFileUpload,
      controllers.uploadFile
    );

    // POST /api/v1/storage/upload-multiple - Upload multiple files
    this.router.post(
      '/upload-multiple',
      controllers.uploadArray,
      validators.validateMultipleFileUpload,
      controllers.uploadMultipleFiles
    );

    // GET /api/v1/storage/:filename - Download file
    this.router.get(
      '/:filename',
      validators.validateFilename,
      controllers.downloadFile
    );

    // DELETE /api/v1/storage/:filename - Delete file
    this.router.delete(
      '/:filename',
      validators.validateFilename,
      controllers.deleteFile
    );

    // GET /api/v1/storage/:filename/info - Get file info
    this.router.get(
      '/:filename/info',
      validators.validateFilename,
      controllers.getFileInfo
    );

    // GET /api/v1/storage/list - List all files
    this.router.get(
      '/list',
      validators.validateFileListQuery,
      controllers.listFiles
    );

    // GET /api/v1/storage/info - Get storage info
    this.router.get('/info', controllers.getStorageInfo);

    logger.info('Storage service routes registered');
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
    logger.info('Storage service initializing...');
    
    // Ensure uploads directory exists
    const fs = await import('fs');
    const path = await import('path');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      logger.info(`Created uploads directory: ${uploadsDir}`);
    }
    
    logServiceInit(this.serviceName);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Check if uploads directory exists and is writable
      if (!fs.existsSync(uploadsDir)) {
        logger.warn('Uploads directory does not exist');
        return false;
      }
      
      // Try to write a test file
      const testFile = path.join(uploadsDir, '.health-check');
      fs.writeFileSync(testFile, 'OK');
      fs.unlinkSync(testFile);
      
      return true;
    } catch (error) {
      logger.error('Storage health check failed', { error });
      return false;
    }
  }
}

// Export singleton instance
export const storageServiceAPI = new StorageServiceAPI();
