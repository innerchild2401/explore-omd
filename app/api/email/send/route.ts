import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, sendTemplateEmail } from '@/lib/mailersend/service';

/**
 * Generic Email API Route
 * POST /api/email/send
 * 
 * Body options:
 * 1. Direct email sending:
 * {
 *   "type": "direct",
 *   "to": [{"email": "user@example.com", "name": "User Name"}],
 *   "subject": "Email Subject",
 *   "html": "<html>...</html>",
 *   "text": "Plain text version",
 *   "from": {"email": "sender@example.com", "name": "Sender Name"},
 *   "replyTo": {"email": "reply@example.com", "name": "Reply Name"},
 *   "tags": ["tag1", "tag2"]
 * }
 * 
 * 2. Template-based email:
 * {
 *   "type": "template",
 *   "to": [{"email": "user@example.com", "name": "User Name"}],
 *   "templateType": "booking_confirmation",
 *   "variables": {"name": "John", "bookingId": "123"},
 *   "businessId": "uuid",
 *   "omdId": "uuid",
 *   "customSubject": "Optional custom subject",
 *   "customContent": "Optional custom HTML content"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'direct') {
      const result = await sendEmail({
        to: body.to,
        subject: body.subject,
        html: body.html,
        text: body.text,
        from: body.from,
        replyTo: body.replyTo,
        cc: body.cc,
        bcc: body.bcc,
        tags: body.tags,
        templateId: body.templateId,
        logToDatabase: body.logToDatabase !== false,
      });

      if (result.success) {
        return NextResponse.json({
          success: true,
          messageId: result.messageId,
          logId: result.logId,
          trialMode: result.trialMode,
          originalRecipients: result.originalRecipients,
          message: result.trialMode
            ? `Email sent to admin (trial mode). Original recipients: ${result.originalRecipients?.join(', ')}`
            : 'Email sent successfully',
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            logId: result.logId,
          },
          { status: 500 }
        );
      }
    } else if (type === 'template') {
      const result = await sendTemplateEmail({
        to: body.to,
        templateType: body.templateType,
        variables: body.variables || {},
        businessId: body.businessId,
        omdId: body.omdId,
        from: body.from,
        replyTo: body.replyTo,
        customSubject: body.customSubject,
        customContent: body.customContent,
      });

      if (result.success) {
        return NextResponse.json({
          success: true,
          messageId: result.messageId,
          logId: result.logId,
          trialMode: result.trialMode,
          originalRecipients: result.originalRecipients,
          message: result.trialMode
            ? `Email sent to admin (trial mode). Original recipients: ${result.originalRecipients?.join(', ')}`
            : 'Email sent successfully',
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            logId: result.logId,
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid email type. Must be "direct" or "template"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error in email API route:', error);
    return NextResponse.json(
      {
        error: 'Failed to send email',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

