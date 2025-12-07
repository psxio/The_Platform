import { Router } from 'express';
import { BaseService } from '../../core/base-service';
import { emailService } from '../../email-service';
import logger, { logServiceInit } from '../../core/logger';
import * as controllers from './controllers';
import * as validators from './validators';

/**
 * Email Service - Manages email sending and SMTP configuration
 * 
 * Endpoints:
 * - GET  /status          - Get email service configuration status
 * - POST /test            - Send a test email
 * - POST /reinitialize    - Reinitialize email service (admin only)
 */
export class EmailServiceAPI extends BaseService {
  private router: Router;

  constructor() {
    super('EmailService');
    this.router = Router();
    this.setupRoutes();
  }

  /**
   * Setup all Email service routes
   */
  private setupRoutes(): void {
    // GET /api/v1/email/status - Get email service status
    this.router.get('/status', controllers.getEmailStatus);

    // POST /api/v1/email/test - Send test email (with validation)
    this.router.post(
      '/test',
      validators.validateTestEmail,
      controllers.sendTestEmail
    );

    // POST /api/v1/email/reinitialize - Reinitialize email service (admin only)
    this.router.post('/reinitialize', controllers.reinitializeEmailService);

    logger.info('Email service routes registered');
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
    logger.info('Email service initializing...');
    // Initialize the email service (already done in app.ts, but safe to call again)
    await emailService.initialize();
    logServiceInit(this.serviceName);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    // Email service is healthy if it's configured, but not required for system health
    return true;
  }
}

// Export singleton instance
export const emailServiceAPI = new EmailServiceAPI();
