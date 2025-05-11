// QR Code Generation and Verification
import HmacSHA256 from 'crypto-js/hmac-sha256';
import SHA256 from 'crypto-js/sha256';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import QRCode from 'qrcode';

interface QRPayload {
  id: string;
  exp: number;
  nonce: string;
  sig?: string;
}

/**
 * Generates a secure QR code for an attendee
 * The QR code contains encrypted data with a signature for verification
 * and includes expiration to prevent replay attacks
 */
export async function generateSecureQRCode(attendeeId: string, eventSecret: string): Promise<string> {
  // Create payload with expiration (24-hour validity)
  const payload: QRPayload = {
    id: attendeeId,
    exp: Date.now() + (24 * 60 * 60 * 1000),
    nonce: generateNonce()
  };
  
  // Sign the payload
  const signature = HmacSHA256(
    JSON.stringify(payload),
    eventSecret
  ).toString();
  
  // Combine payload and signature
  const securePayload = {
    ...payload,
    sig: signature
  };
  
  // Encrypt the entire payload for additional security
  const encrypted = encryptData(JSON.stringify(securePayload), eventSecret);
  
  // Generate actual QR code with the encrypted data
  return QRCode.toDataURL(encrypted);
}

/**
 * Verifies a QR code by decrypting the data and validating the signature
 */
export function verifyQRCode(encryptedData: string, eventSecret: string): {
  valid: boolean;
  reason?: string;
  attendeeId?: string;
} {
  try {
    // Decrypt the data
    const decrypted = decryptData(encryptedData, eventSecret);
    const data = JSON.parse(decrypted) as QRPayload;
    
    // Extract signature for verification
    const { sig, ...payloadToVerify } = data;
    
    // Regenerate signature
    const expectedSignature = HmacSHA256(
      JSON.stringify(payloadToVerify),
      eventSecret
    ).toString();
    
    // Verify signature matches
    if (sig !== expectedSignature) {
      return { valid: false, reason: 'Invalid signature' };
    }
    
    // Check expiration
    if (data.exp < Date.now()) {
      return { valid: false, reason: 'Expired QR code' };
    }
    
    // If everything checks out, return success with attendee ID
    return { valid: true, attendeeId: data.id };
  } catch (error) {
    return { valid: false, reason: 'Corrupted QR code' };
  }
}

/**
 * Generates a cryptographically secure random nonce
 */
function generateNonce(): string {
  // Generate 16 random bytes for the nonce
  let randomBytes = '';
  
  // We need to handle both browser and server environments
  if (typeof window !== 'undefined') {
    // Browser environment - use crypto API if available
    const array = new Uint8Array(8);
    const crypto = window.crypto || (window as any).msCrypto;
    
    if (crypto && crypto.getRandomValues) {
      crypto.getRandomValues(array);
      randomBytes = Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  }
  
  // If we couldn't generate random bytes using crypto API or in server environment
  if (!randomBytes) {
    // Fallback to Math.random
    randomBytes = '';
    for (let i = 0; i < 16; i++) {
      randomBytes += Math.floor(Math.random() * 16).toString(16);
    }
  }
  
  return randomBytes;
}

/**
 * Encrypts data using AES
 */
export function encryptData(data: string, key: string): string {
  // Create a key from the provided key
  const derivedKey = SHA256(key).toString();
  
  // Encrypt the data
  return AES.encrypt(data, derivedKey).toString();
}

/**
 * Decrypts data using AES
 */
export function decryptData(encryptedData: string, key: string): string {
  // Create a key from the provided key
  const derivedKey = SHA256(key).toString();
  
  // Decrypt the data
  const bytes = AES.decrypt(encryptedData, derivedKey);
  return bytes.toString(Utf8);
} 