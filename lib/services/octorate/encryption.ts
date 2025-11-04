// Simple encryption utility for storing OAuth tokens
// In production, use Supabase Vault or a more robust encryption solution

const ENCRYPTION_KEY = process.env.OCTORATE_ENCRYPTION_KEY || 'default-key-change-in-production';

// Simple XOR encryption (for development - use proper encryption in production)
export function encrypt(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    result += String.fromCharCode(char ^ keyChar);
  }
  return Buffer.from(result).toString('base64');
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const text = Buffer.from(encryptedText, 'base64').toString('binary');
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(char ^ keyChar);
    }
    return result;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

