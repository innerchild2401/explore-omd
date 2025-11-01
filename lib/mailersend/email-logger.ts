import { createServiceClient } from '@/lib/supabase/service';

/**
 * Email Logger Service
 * Logs email sending attempts to the database for tracking and debugging
 */
export interface EmailLogData {
  template_id?: string;
  recipient_email: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
  sent_at?: Date;
}

export async function logEmail(emailData: EmailLogData): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('email_logs')
      .insert({
        template_id: emailData.template_id || null,
        recipient_email: emailData.recipient_email,
        subject: emailData.subject,
        status: emailData.status,
        error_message: emailData.error_message || null,
        sent_at: emailData.sent_at ? emailData.sent_at.toISOString() : null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error logging email to database:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Exception while logging email:', error);
    return null;
  }
}

export async function updateEmailLog(
  logId: string,
  updates: Partial<EmailLogData>
): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    
    const updateData: any = {};
    
    if (updates.status) updateData.status = updates.status;
    if (updates.error_message !== undefined) updateData.error_message = updates.error_message;
    if (updates.sent_at) updateData.sent_at = updates.sent_at.toISOString();

    const { error } = await supabase
      .from('email_logs')
      .update(updateData)
      .eq('id', logId);

    if (error) {
      console.error('Error updating email log:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception while updating email log:', error);
    return false;
  }
}

/**
 * Get email template from database
 */
export async function getEmailTemplate(
  businessId?: string,
  omdId?: string,
  type?: string
): Promise<any | null> {
  try {
    const supabase = createServiceClient();
    
    let query = supabase.from('email_templates').select('*');

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    if (omdId) {
      query = query.eq('omd_id', omdId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching email template:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception while fetching email template:', error);
    return null;
  }
}

