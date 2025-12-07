import { Request, Response } from 'express';
import { emailService } from '../../email-service';

/**
 * Get email service configuration status
 */
export async function getEmailStatus(req: Request, res: Response) {
  try {
    const isReady = emailService.isReady();
    
    res.json({
      configured: isReady,
      ready: isReady,
      hasCredentials: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      host: process.env.SMTP_HOST || null,
      port: process.env.SMTP_PORT || null,
      from: process.env.SMTP_FROM || process.env.SMTP_USER || null,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get email service status',
      message: error.message,
    });
  }
}

/**
 * Test email sending
 */
export async function sendTestEmail(req: Request, res: Response) {
  try {
    const { to, subject, message } = req.body;
    
    if (!emailService.isReady()) {
      return res.status(503).json({
        error: 'Email service not configured',
        message: 'SMTP credentials are not set up',
      });
    }

    const testSubject = subject || 'Test Email from The Platform';
    const testMessage = message || '<p>This is a test email from The Platform.</p>';
    
    const success = await emailService.sendEmail(to, testSubject, testMessage);
    
    if (success) {
      res.json({
        success: true,
        message: `Test email sent to ${to}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send test email',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to send test email',
      message: error.message,
    });
  }
}

/**
 * Reinitialize email service (admin only)
 */
export async function reinitializeEmailService(req: Request, res: Response) {
  try {
    const success = await emailService.initialize();
    
    res.json({
      success,
      configured: success,
      message: success 
        ? 'Email service reinitialized successfully' 
        : 'Failed to initialize email service - check SMTP credentials',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to reinitialize email service',
      message: error.message,
    });
  }
}
