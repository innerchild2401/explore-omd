import { mailerSendClient } from './client';
import { logEmail, updateEmailLog, getEmailTemplate, EmailLogData } from './email-logger';
import { EmailTemplateType } from '@/types';

/**
 * Comprehensive Email Service
 * Handles all email sending operations with database logging
 */

export interface SendEmailOptions {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  html: string;
  text?: string;
  from?: { email: string; name?: string };
  replyTo?: { email: string; name?: string };
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  tags?: string[];
  templateId?: string;
  logToDatabase?: boolean; // Default: true
}

export interface SendTemplateEmailOptions {
  to: Array<{ email: string; name?: string }>;
  templateType: EmailTemplateType;
  variables: Record<string, any>;
  businessId?: string;
  omdId?: string;
  from?: { email: string; name?: string };
  replyTo?: { email: string; name?: string };
  customSubject?: string;
  customContent?: string;
}

/**
 * Replace template variables in content
 */
function replaceTemplateVariables(
  content: string,
  variables: Record<string, any>
): string {
  let result = content;
  
  for (const [key, value] of Object.entries(variables)) {
    // Support both {{variable}} and {variable} syntax
    const regex1 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const regex2 = new RegExp(`\\{${key}\\}`, 'g');
    
    result = result.replace(regex1, String(value));
    result = result.replace(regex2, String(value));
  }
  
  return result;
}

/**
 * Convert HTML to plain text (basic implementation)
 */
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Send an email with optional database logging
 */
export async function sendEmail(options: SendEmailOptions): Promise<{
  success: boolean;
  logId?: string;
  messageId?: string;
  error?: any;
  trialMode?: boolean;
  originalRecipients?: string[];
}> {
  const shouldLog = options.logToDatabase !== false;
  let logId: string | null = null;

  // Create initial log entry
  if (shouldLog) {
    logId = await logEmail({
      template_id: options.templateId || undefined,
      recipient_email: options.to.map(r => r.email).join(', '),
      subject: options.subject,
      status: 'pending',
    });
  }

  // Send email via MailerSend
  const result = await mailerSendClient.sendEmail({
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || htmlToText(options.html),
    from: options.from,
    replyTo: options.replyTo,
    cc: options.cc,
    bcc: options.bcc,
    tags: options.tags,
  });

  // Update log entry with result
  if (shouldLog && logId) {
    await updateEmailLog(logId, {
      status: result.success ? 'sent' : 'failed',
      error_message: result.error ? JSON.stringify(result.error) : undefined,
      sent_at: result.success ? new Date() : undefined,
    });
  }

  return {
    ...result,
    logId: logId || undefined,
  };
}

/**
 * Send email using a template from the database
 */
export async function sendTemplateEmail(options: SendTemplateEmailOptions): Promise<{
  success: boolean;
  logId?: string;
  messageId?: string;
  error?: any;
  trialMode?: boolean;
  originalRecipients?: string[];
}> {
  // Fetch template from database
  const template = await getEmailTemplate(
    options.businessId,
    options.omdId,
    options.templateType
  );

  if (!template && !options.customContent) {
    return {
      success: false,
      error: {
        message: `Email template of type '${options.templateType}' not found`,
      },
    };
  }

  // Use custom content if provided, otherwise use template content
  let htmlContent = options.customContent || template.content;
  let subject = options.customSubject || template.subject;

  // Replace variables in content and subject
  htmlContent = replaceTemplateVariables(htmlContent, options.variables);
  subject = replaceTemplateVariables(subject, options.variables);

  // Send email
  return sendEmail({
    to: options.to,
    subject,
    html: htmlContent,
    from: options.from,
    replyTo: options.replyTo,
    templateId: template?.id,
    tags: [options.templateType],
  });
}

/**
 * Convenience functions for specific email types
 */

export async function sendBookingConfirmation(options: {
  to: Array<{ email: string; name?: string }>;
  variables: Record<string, any>;
  businessId?: string;
  omdId?: string;
}): Promise<ReturnType<typeof sendTemplateEmail>> {
  return sendTemplateEmail({
    ...options,
    templateType: 'booking_confirmation',
  });
}

export async function sendReservationConfirmation(options: {
  to: Array<{ email: string; name?: string }>;
  variables: Record<string, any>;
  businessId?: string;
  omdId?: string;
}): Promise<ReturnType<typeof sendTemplateEmail>> {
  return sendTemplateEmail({
    ...options,
    templateType: 'reservation_confirmation',
  });
}

export async function sendCancellationEmail(options: {
  to: Array<{ email: string; name?: string }>;
  variables: Record<string, any>;
  businessId?: string;
  omdId?: string;
}): Promise<ReturnType<typeof sendTemplateEmail>> {
  return sendTemplateEmail({
    ...options,
    templateType: 'cancellation',
  });
}

export async function sendReminderEmail(options: {
  to: Array<{ email: string; name?: string }>;
  variables: Record<string, any>;
  businessId?: string;
  omdId?: string;
}): Promise<ReturnType<typeof sendTemplateEmail>> {
  return sendTemplateEmail({
    ...options,
    templateType: 'reminder',
  });
}

export async function sendPromotionalEmail(options: {
  to: Array<{ email: string; name?: string }>;
  variables: Record<string, any>;
  businessId?: string;
  omdId?: string;
}): Promise<ReturnType<typeof sendTemplateEmail>> {
  return sendTemplateEmail({
    ...options,
    templateType: 'promotional',
  });
}

