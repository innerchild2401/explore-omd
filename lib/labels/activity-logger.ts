/**
 * Label Activity Logger
 * 
 * Helper functions for logging label-related activities
 */

import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

interface LogLabelActivityParams {
  actionType: 
    | 'category_created'
    | 'category_updated'
    | 'category_deleted'
    | 'label_created'
    | 'label_updated'
    | 'label_deleted'
    | 'label_assigned_to_business'
    | 'label_removed_from_business'
    | 'label_bulk_assigned'
    | 'label_bulk_removed';
  entityType: 'category' | 'label' | 'business_label';
  entityId: string;
  relatedEntityId?: string;
  omdId?: string;
  userId?: string;
  userRole?: string;
  businessId?: string;
  labelId?: string;
  categoryId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log label activity to the database
 */
export async function logLabelActivity(params: LogLabelActivityParams): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Call the database function to log activity
    const { error } = await supabase.rpc('log_label_activity', {
      p_action_type: params.actionType,
      p_entity_type: params.entityType,
      p_entity_id: params.entityId,
      p_related_entity_id: params.relatedEntityId || null,
      p_omd_id: params.omdId || null,
      p_user_id: params.userId || null,
      p_user_role: params.userRole || null,
      p_business_id: params.businessId || null,
      p_label_id: params.labelId || null,
      p_category_id: params.categoryId || null,
      p_old_values: params.oldValues ? JSON.stringify(params.oldValues) : null,
      p_new_values: params.newValues ? JSON.stringify(params.newValues) : null,
      p_metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    });

    if (error) {
      log.warn('Failed to log label activity', {
        error: error.message,
        actionType: params.actionType,
        entityId: params.entityId,
      });
    } else {
      log.debug('Label activity logged', {
        actionType: params.actionType,
        entityId: params.entityId,
      });
    }
  } catch (err) {
    // Don't throw - logging failures shouldn't break the main operation
    log.error('Error logging label activity', err, {
      actionType: params.actionType,
      entityId: params.entityId,
    });
  }
}

/**
 * Get client IP address from request
 */
export function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return undefined;
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: Request): string | undefined {
  return req.headers.get('user-agent') || undefined;
}

