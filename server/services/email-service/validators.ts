import { body } from 'express-validator';

/**
 * Validator for sending test email
 */
export const validateTestEmail = [
  body('to')
    .isEmail()
    .withMessage('Valid email address is required'),
  body('subject')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Subject must be less than 200 characters'),
  body('message')
    .optional()
    .isString()
    .withMessage('Message must be a string'),
];
