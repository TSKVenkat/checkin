// QR Code Generation and Verification
import crypto from 'crypto';
import QRCode from 'qrcode';

interface QRPayload {
  id: string;
  exp: number;
  nonce: string;
  fp?: string;  // Fingerprint data (optional)
  ip?: string;  // Client IP (optional)
  env?: string; // Device environment hash
  sig?: string; // Signature
}

/**
 * Generates a secure QR code for an attendee
 * The QR code contains encrypted data with a signature for verification
 * and includes expiration to prevent replay attacks
 */
export async function generateSecureQRCode(
  attendeeId: string, 
  eventSecret: string, 
  options: { 
    expiresIn?: number,  // Expiration in milliseconds
    clientIp?: string,   // Client IP for binding
    deviceInfo?: string  // Device fingerprint
  } = {}
): Promise<string> {
  // Create payload with expiration (15-minute validity by default)
  const expiresIn = options.expiresIn || (15 * 60 * 1000); // 15 minutes by default
  
  const payload: QRPayload = {
    id: attendeeId,
    exp: Date.now() + expiresIn,
    nonce: crypto.randomBytes(16).toString('hex') // Enhanced entropy
  };
  
  // Add fingerprinting if available
  if (options.deviceInfo) {
    // Hash the device info to anonymize it
    payload.env = crypto
      .createHash('sha256')
      .update(options.deviceInfo)
      .digest('hex')
      .substring(0, 16); // Only use first 16 chars for size efficiency
  }
  
  // Add IP binding if available
  if (options.clientIp) {
    // Hash the IP to anonymize it
    payload.ip = crypto
      .createHash('sha256')
      .update(options.clientIp)
      .digest('hex')
      .substring(0, 16); // Only use first 16 chars for size efficiency
  }
  
  // Sign the payload with HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', eventSecret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  // Combine payload and signature
  const securePayload = {
    ...payload,
    sig: signature
  };
  
  // Encrypt the entire payload for additional security using AES-256-GCM
  const encrypted = encryptData(JSON.stringify(securePayload), eventSecret);
  
  // Generate actual QR code with the encrypted data
  const qrOptions = {
    errorCorrectionLevel: 'H', // High error correction for damaged codes
    margin: 1,                 // Smaller margin for better scanning
    color: {
      dark: '#000000FF',       // Black dots
      light: '#FFFFFFFF'       // White background
    }
  };
  
  return QRCode.toDataURL(encrypted);
}

/**
 * Enhanced QR code verification that supports IP binding and device fingerprinting
 * This is an extended version of the basic verifyQRCode in generator.ts
 */
export function verifySecureQRCode(
  encryptedData: string, 
  eventSecret: string,
  options: {
    clientIp?: string,
    deviceInfo?: string
  } = {}
): {
  valid: boolean;
  reason?: string;
  attendeeId?: string;
  expiresIn?: number;
} {
  try {
    // Decrypt the data
    const decrypted = decryptData(encryptedData, eventSecret);
    const data = JSON.parse(decrypted) as QRPayload;
    
    // Extract signature for verification
    const { sig, ...payloadToVerify } = data;
    
    // Regenerate signature
    const expectedSignature = crypto
      .createHmac('sha256', eventSecret)
      .update(JSON.stringify(payloadToVerify))
      .digest('hex');
    
    // Verify signature matches
    if (sig !== expectedSignature) {
      return { valid: false, reason: 'QR code has been tampered with' };
    }
    
    // Check expiration
    if (data.exp < Date.now()) {
      return { valid: false, reason: 'QR code has expired' };
    }
    
    // Verify IP binding if provided
    if (options.clientIp && data.ip) {
      const clientIpHash = crypto
        .createHash('sha256')
        .update(options.clientIp)
        .digest('hex')
        .substring(0, 16);
        
      if (clientIpHash !== data.ip) {
        return { valid: false, reason: 'QR code was issued for a different network' };
      }
    }
    
    // Verify device fingerprint if provided
    if (options.deviceInfo && data.env) {
      const deviceHash = crypto
        .createHash('sha256')
        .update(options.deviceInfo)
        .digest('hex')
        .substring(0, 16);
        
      if (deviceHash !== data.env) {
        return { valid: false, reason: 'QR code was issued for a different device' };
      }
    }
    
    // If everything checks out, return success with attendee ID
    return { 
      valid: true, 
      attendeeId: data.id,
      expiresIn: data.exp - Date.now() // Time remaining in milliseconds
    };
  } catch (error) {
    console.error('QR verification error:', error);
    return { valid: false, reason: 'Invalid QR code format' };
  }
}

/**
 * Encrypts data using AES-256-GCM with authentication
 */
export function encryptData(data: string, key: string): string {
  // Create a 32-byte key from the provided key using SHA-256
  const derivedKey = crypto.createHash('sha256').update(key).digest();
  
  // Create initialization vector
  const iv = crypto.randomBytes(16);
  
  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  
  // Encrypt the data
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get the auth tag
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Return IV + AuthTag + Encrypted Data
  return iv.toString('hex') + authTag + encrypted;
}

/**
 * Decrypts data using AES-256-GCM with authentication
 */
export function decryptData(encryptedData: string, key: string): string {
  try {
    // Create a 32-byte key from the provided key using SHA-256
    const derivedKey = crypto.createHash('sha256').update(key).digest();
    
    // Extract IV (first 32 hex characters = 16 bytes)
    const iv = Buffer.from(encryptedData.substring(0, 32), 'hex');
    
    // Extract auth tag (next 32 hex characters = 16 bytes)
    const authTag = Buffer.from(encryptedData.substring(32, 64), 'hex');
    
    // Extract actual encrypted data (everything after auth tag)
    const encryptedText = encryptedData.substring(64);
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt data. The QR code may have been tampered with.');
  }
} 