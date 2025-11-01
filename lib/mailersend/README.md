# MailerSend Email Service

A comprehensive email sending solution using MailerSend API, integrated with the Explore OMD platform's database for template management and email logging.

## Overview

This MailerSend implementation provides:

- ✅ Centralized email client configuration
- ✅ Database-backed email templates
- ✅ Automatic email logging
- ✅ Support for all email template types
- ✅ Trial mode support for development
- ✅ Type-safe TypeScript interfaces
- ✅ Convenient API routes for email sending

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```env
# Required
MAILER_SEND_API_KEY=mlsn.your_api_key_here

# Optional
MAILER_SEND_FROM_EMAIL=noreply@yourdomain.com
MAILER_SEND_FROM_NAME=Your OMD Team
MAILER_SEND_TRIAL_MODE=false
MAILER_SEND_TRIAL_EMAIL=your-verified-email@example.com
```

**Note:** If `MAILER_SEND_TRIAL_MODE=true`, all emails will be sent to the trial email address instead of the actual recipients. This is useful for MailerSend trial accounts that only allow sending to verified emails.

## Usage

### 1. Direct Email Sending

Send an email directly with HTML/text content:

```typescript
import { sendEmail } from '@/lib/mailersend';

const result = await sendEmail({
  to: [{ email: 'user@example.com', name: 'John Doe' }],
  subject: 'Welcome to Our Platform',
  html: '<h1>Welcome!</h1><p>Thank you for joining us.</p>',
  text: 'Welcome! Thank you for joining us.',
  tags: ['welcome', 'onboarding'],
});

if (result.success) {
  console.log('Email sent!', result.messageId);
} else {
  console.error('Failed to send:', result.error);
}
```

### 2. Template-Based Email Sending

Send emails using templates stored in the database:

```typescript
import { sendTemplateEmail } from '@/lib/mailersend';

const result = await sendTemplateEmail({
  to: [{ email: 'customer@example.com', name: 'Jane Doe' }],
  templateType: 'booking_confirmation',
  variables: {
    customerName: 'Jane Doe',
    bookingId: 'BK123456',
    checkIn: '2025-12-25',
    checkOut: '2025-12-30',
    hotelName: 'Grand Hotel',
  },
  businessId: 'business-uuid',
  omdId: 'omd-uuid',
});
```

### 3. Convenience Functions

Use pre-built functions for specific email types:

```typescript
import {
  sendBookingConfirmation,
  sendReservationConfirmation,
  sendCancellationEmail,
  sendReminderEmail,
  sendPromotionalEmail,
} from '@/lib/mailersend';

// Booking confirmation
await sendBookingConfirmation({
  to: [{ email: 'guest@example.com', name: 'Guest Name' }],
  variables: {
    bookingId: 'BK123',
    checkIn: '2025-12-25',
    checkOut: '2025-12-30',
    roomType: 'Deluxe Suite',
    totalPrice: '$500',
  },
  businessId: 'hotel-uuid',
});

// Reservation confirmation
await sendReservationConfirmation({
  to: [{ email: 'customer@example.com' }],
  variables: {
    reservationId: 'RES456',
    date: '2025-12-25',
    time: '7:00 PM',
    partySize: 4,
    restaurantName: 'Fine Dining',
  },
  businessId: 'restaurant-uuid',
});
```

### 4. Using the API Route

You can also send emails via the API endpoint:

**Direct Email:**
```bash
POST /api/email/send
Content-Type: application/json

{
  "type": "direct",
  "to": [{"email": "user@example.com", "name": "User Name"}],
  "subject": "Test Email",
  "html": "<h1>Hello</h1><p>This is a test email.</p>",
  "text": "Hello\n\nThis is a test email.",
  "tags": ["test"]
}
```

**Template Email:**
```bash
POST /api/email/send
Content-Type: application/json

{
  "type": "template",
  "to": [{"email": "user@example.com", "name": "User Name"}],
  "templateType": "booking_confirmation",
  "variables": {
    "customerName": "John Doe",
    "bookingId": "BK123"
  },
  "businessId": "business-uuid",
  "omdId": "omd-uuid"
}
```

## Email Template Types

The system supports the following email template types (defined in `types/index.ts`):

- `booking_confirmation` - Hotel/experience booking confirmations
- `reservation_confirmation` - Restaurant table reservations
- `order_confirmation` - Food order confirmations
- `cancellation` - Booking/reservation cancellations
- `reminder` - Booking/reservation reminders
- `promotional` - Marketing/promotional emails

## Database Integration

### Email Templates Table

Templates are stored in the `email_templates` table with:
- `business_id` - Optional business-specific template
- `omd_id` - Optional OMD-wide template
- `type` - Template type (see above)
- `subject` - Email subject line (supports variables)
- `content` - HTML email content (supports variables)
- `variables` - Array of variable names used in template

### Email Logs Table

All email sending attempts are logged in the `email_logs` table:
- `template_id` - Link to email template (if used)
- `recipient_email` - Email address
- `subject` - Email subject
- `status` - `pending`, `sent`, or `failed`
- `sent_at` - Timestamp when sent
- `error_message` - Error details if failed

### Template Variables

Templates support variable replacement using `{{variableName}}` or `{variableName}` syntax:

**Template Example:**
```html
<h1>Hello {{customerName}}!</h1>
<p>Your booking {{bookingId}} has been confirmed.</p>
<p>Check-in: {{checkIn}}</p>
```

**Usage:**
```typescript
await sendTemplateEmail({
  to: [{ email: 'user@example.com' }],
  templateType: 'booking_confirmation',
  variables: {
    customerName: 'John Doe',
    bookingId: 'BK123',
    checkIn: '2025-12-25',
  },
});
```

## Advanced Usage

### Custom Sender

Override default sender for specific emails:

```typescript
await sendEmail({
  to: [{ email: 'user@example.com' }],
  subject: 'Custom Sender',
  html: '<p>Hello</p>',
  from: {
    email: 'custom@example.com',
    name: 'Custom Sender',
  },
});
```

### CC/BCC

Add CC and BCC recipients:

```typescript
await sendEmail({
  to: [{ email: 'primary@example.com' }],
  cc: [{ email: 'cc@example.com' }],
  bcc: [{ email: 'bcc@example.com' }],
  subject: 'Email with CC/BCC',
  html: '<p>Hello</p>',
});
```

### Reply-To

Set custom reply-to address:

```typescript
await sendEmail({
  to: [{ email: 'user@example.com' }],
  subject: 'Reply to Support',
  html: '<p>Hello</p>',
  replyTo: {
    email: 'support@example.com',
    name: 'Support Team',
  },
});
```

### Disable Database Logging

Skip database logging for specific emails:

```typescript
await sendEmail({
  to: [{ email: 'user@example.com' }],
  subject: 'No Log',
  html: '<p>Hello</p>',
  logToDatabase: false,
});
```

## Error Handling

All email functions return a result object:

```typescript
interface EmailResult {
  success: boolean;
  logId?: string;              // Database log ID (if logged)
  messageId?: string;          // MailerSend message ID
  error?: any;                 // Error details if failed
  trialMode?: boolean;         // True if in trial mode
  originalRecipients?: string[]; // Original recipients if trial mode
}
```

**Example:**
```typescript
const result = await sendEmail({...});

if (!result.success) {
  console.error('Email failed:', result.error);
  // Handle error (retry, notify admin, etc.)
} else {
  console.log('Email sent successfully!');
  if (result.trialMode) {
    console.log('Trial mode: sent to', result.originalRecipients);
  }
}
```

## File Structure

```
lib/mailersend/
├── index.ts              # Main exports
├── client.ts             # MailerSend client configuration
├── service.ts            # Main email service functions
├── email-logger.ts       # Database logging utilities
└── README.md            # This file
```

## Migration from Existing Code

The existing approval email implementation in `app/api/email/send-approval/route.ts` can be refactored to use the new service:

**Before:**
```typescript
const mailerSend = new MailerSend({
  apiKey: process.env.MAILER_SEND_API_KEY || '',
});
// ... manual email sending
```

**After:**
```typescript
import { sendEmail } from '@/lib/mailersend';

await sendEmail({
  to: [{ email: recipientEmail, name: recipientName }],
  subject: `Congratulations! Your ${businessName} has been approved`,
  html: htmlContent,
  tags: ['business_approval'],
});
```

## Troubleshooting

### Trial Mode Issues

If you're using a MailerSend trial account:
1. Set `MAILER_SEND_TRIAL_MODE=true` in `.env.local`
2. Add your verified email to `MAILER_SEND_TRIAL_EMAIL`
3. All emails will be redirected to the trial email address

### API Key Issues

- Ensure `MAILER_SEND_API_KEY` is set in `.env.local`
- Verify the API key is valid in MailerSend dashboard
- Check that the API key has necessary permissions

### Database Logging Issues

- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set for server-side operations
- Verify `email_logs` table exists in your database
- Check database RLS policies if using non-service-role client

## Resources

- [MailerSend Node.js SDK Documentation](https://github.com/mailersend/mailersend-nodejs)
- [MailerSend API Documentation](https://developers.mailersend.com/)
- [MailerSend Email Templates Guide](https://www.mailersend.com/help/email-templates)

