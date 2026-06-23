import * as crypto from 'crypto';

const ALGORITHM  = 'aes-256-gcm';
const IV_LENGTH  = 16;
const TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from the CRYPTO_SECRET env var.
 * The secret can be any length — we SHA-256 hash it to get exactly 32 bytes.
 */
function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a single base64 string: iv + authTag + ciphertext
 */
export function encrypt(plaintext: string, secret: string): string {
  const key        = deriveKey(secret);
  const iv         = crypto.randomBytes(IV_LENGTH);
  const cipher     = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted  = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag    = cipher.getAuthTag();

  // Pack: iv (16) + authTag (16) + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypt a base64 string produced by encrypt().
 */
export function decrypt(encryptedBase64: string, secret: string): string {
  const key    = deriveKey(secret);
  const packed = Buffer.from(encryptedBase64, 'base64');

  const iv         = packed.subarray(0, IV_LENGTH);
  const authTag    = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}
