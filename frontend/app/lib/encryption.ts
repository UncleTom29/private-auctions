import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('ENCRYPTION_KEY must be set in production');
}

// Derive key from base64 string
function getKey(): Buffer {
  if (!ENCRYPTION_KEY) {
    // Use a default key for development (insecure!)
    console.warn('WARNING: Using default encryption key. Set ENCRYPTION_KEY in production.');
    return Buffer.from('0'.repeat(64), 'hex');
  }
  return Buffer.from(ENCRYPTION_KEY, 'base64');
}

/**
 * Encrypt sensitive data (PII)
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return: iv + authTag + encrypted (all in hex)
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(ciphertext: string): string {
  try {
    const key = getKey();
    
    // Extract components from ciphertext
    const iv = Buffer.from(ciphertext.slice(0, IV_LENGTH * 2), 'hex');
    const authTag = Buffer.from(
      ciphertext.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2),
      'hex'
    );
    const encrypted = ciphertext.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt shipping address
 */
export interface ShippingAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export function encryptAddress(address: ShippingAddress): string {
  return encrypt(JSON.stringify(address));
}

/**
 * Decrypt shipping address
 */
export function decryptAddress(encryptedAddress: string): ShippingAddress {
  const decrypted = decrypt(encryptedAddress);
  return JSON.parse(decrypted);
}

/**
 * Hash data (one-way, for commitments)
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash with salt
 */
export function hashWithSalt(data: string, salt: string): string {
  return hash(data + salt);
}

/**
 * Generate secure random salt
 */
export function generateSalt(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Verify hash
 */
export function verifyHash(data: string, expectedHash: string, salt?: string): boolean {
  const computedHash = salt ? hashWithSalt(data, salt) : hash(data);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(expectedHash)
  );
}

/**
 * Encrypt email address
 */
export function encryptEmail(email: string): string {
  return encrypt(email);
}

/**
 * Decrypt email address
 */
export function decryptEmail(encryptedEmail: string): string {
  return decrypt(encryptedEmail);
}

/**
 * Mask email for display (show partial)
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const visibleChars = Math.min(3, local.length - 1);
  const masked = local.slice(0, visibleChars) + '*'.repeat(local.length - visibleChars);
  return `${masked}@${domain}`;
}

/**
 * Mask phone number
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}

/**
 * Generate API key
 */
export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Verify API key
 */
export function verifyApiKey(apiKey: string, hashedKey: string): boolean {
  const hash = hashApiKey(apiKey);
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hashedKey)
  );
}
