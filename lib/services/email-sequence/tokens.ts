import crypto from 'crypto';

/**
 * Generate a secure token for email links
 * Uses reservation ID and email to create a signed token
 */
export function generateEmailToken(reservationId: string, email: string): string {
  const secret = process.env.EMAIL_TOKEN_SECRET || process.env.NEXT_PUBLIC_SUPABASE_URL || 'default-secret';
  const data = `${reservationId}:${email}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Verify and decode email token
 * Returns reservation ID and email if token is valid
 */
export function verifyEmailToken(token: string, reservationId: string, email: string): boolean {
  const secret = process.env.EMAIL_TOKEN_SECRET || process.env.NEXT_PUBLIC_SUPABASE_URL || 'default-secret';
  
  // Try to verify with current timestamp and recent timestamps (within 30 days)
  const now = Date.now();
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  
  // Check tokens for the last 30 days (in case of clock skew or delayed emails)
  for (let offset = 0; offset <= maxAge; offset += 24 * 60 * 60 * 1000) { // Check daily
    const data = `${reservationId}:${email}:${now - offset}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    const expectedToken = hmac.digest('hex');
    
    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
      return true;
    }
  }
  
  return false;
}

