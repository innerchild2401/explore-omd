/**
 * MailerSend Email Service
 * 
 * Comprehensive email sending solution using MailerSend API
 * with database integration for templates and logging
 */

// Export main service functions
export {
  sendEmail,
  sendTemplateEmail,
  sendBookingConfirmation,
  sendReservationConfirmation,
  sendCancellationEmail,
  sendReminderEmail,
  sendPromotionalEmail,
  type SendEmailOptions,
  type SendTemplateEmailOptions,
} from './service';

// Export client (for advanced usage)
export { mailerSendClient, MailerSendClient } from './client';

// Export email logger utilities
export {
  logEmail,
  updateEmailLog,
  getEmailTemplate,
  type EmailLogData,
} from './email-logger';

