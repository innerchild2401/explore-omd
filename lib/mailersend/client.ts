import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

/**
 * MailerSend Client Configuration
 * Centralized client for sending emails via MailerSend
 */
class MailerSendClient {
  private client: MailerSend;
  private defaultSenderEmail: string;
  private defaultSenderName: string;
  private trialMode: boolean;
  private trialEmail?: string;

  constructor() {
    const apiKey = process.env.MAILER_SEND_API_KEY;
    
    if (!apiKey) {
      throw new Error('MAILER_SEND_API_KEY is not configured in environment variables');
    }

    this.client = new MailerSend({
      apiKey,
    });

    // Default sender - in production, this should come from OMD settings or domain configuration
    this.defaultSenderEmail = process.env.MAILER_SEND_FROM_EMAIL || "test-z0vklo6pvy7l7qrx.mlsender.net";
    this.defaultSenderName = process.env.MAILER_SEND_FROM_NAME || "Your OMD Team";
    
    // Trial mode configuration (for MailerSend trial accounts that only allow sending to verified emails)
    this.trialMode = process.env.MAILER_SEND_TRIAL_MODE === 'true';
    this.trialEmail = process.env.MAILER_SEND_TRIAL_EMAIL || 'filip.alex24@gmail.com';
  }

  /**
   * Create a sender object
   */
  createSender(email?: string, name?: string): Sender {
    return new Sender(
      email || this.defaultSenderEmail,
      name || this.defaultSenderName
    );
  }

  /**
   * Create recipient objects
   */
  createRecipients(recipients: Array<{ email: string; name?: string }>): Recipient[] {
    return recipients.map(r => new Recipient(r.email, r.name || r.email));
  }

  /**
   * Send an email using MailerSend
   */
  async sendEmail(params: {
    to: Array<{ email: string; name?: string }>;
    subject: string;
    html: string;
    text?: string;
    from?: { email: string; name?: string };
    replyTo?: { email: string; name?: string };
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    attachments?: Array<{ filename: string; content: string; type?: string }>;
    tags?: string[];
  }): Promise<{ success: boolean; messageId?: string; error?: any; trialMode?: boolean; originalRecipients?: string[] }> {
    try {
      const sender = params.from 
        ? this.createSender(params.from.email, params.from.name)
        : this.createSender();

      // Handle trial mode - redirect emails to trial email address
      let actualRecipients = params.to;
      let originalRecipients: string[] | undefined;

      if (this.trialMode) {
        originalRecipients = params.to.map(r => r.email);
        actualRecipients = [{ email: this.trialEmail!, name: 'Test Recipient' }];
      }

      const recipients = this.createRecipients(actualRecipients);

      const emailParams = new EmailParams()
        .setFrom(sender)
        .setTo(recipients)
        .setReplyTo(params.replyTo ? this.createSender(params.replyTo.email, params.replyTo.name) : sender)
        .setSubject(params.subject)
        .setHtml(params.html);

      if (params.text) {
        emailParams.setText(params.text);
      }

      if (params.cc && params.cc.length > 0) {
        emailParams.setCc(this.createRecipients(params.cc));
      }

      if (params.bcc && params.bcc.length > 0) {
        emailParams.setBcc(this.createRecipients(params.bcc));
      }

      // Note: Attachments would need base64 encoding in MailerSend SDK v2.6.0
      // Implementation depends on SDK version support

      if (params.tags && params.tags.length > 0) {
        emailParams.setTags(params.tags);
      }

      const response = await this.client.email.send(emailParams);

      return {
        success: true,
        messageId: (response as any).body?.message_id || undefined,
        trialMode: this.trialMode,
        originalRecipients: originalRecipients
      };
    } catch (error: any) {
      console.error('MailerSend error:', error);
      
      let errorDetails: any = {
        message: error.message || 'Unknown error',
      };

      if (error.body) {
        errorDetails.mailersendError = error.body;
      }

      if (error.response) {
        errorDetails.statusCode = error.response.statusCode;
      }

      return {
        success: false,
        error: errorDetails
      };
    }
  }

  /**
   * Get the client instance (for advanced usage)
   */
  getClient(): MailerSend {
    return this.client;
  }

  /**
   * Check if trial mode is enabled
   */
  isTrialMode(): boolean {
    return this.trialMode;
  }
}

// Export singleton instance
export const mailerSendClient = new MailerSendClient();

// Export class for creating custom instances if needed
export { MailerSendClient };

