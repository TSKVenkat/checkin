import QRCode from 'qrcode';
import crypto from 'crypto';

// Secret key for QR code encryption and signing
const QR_SECRET = process.env.QR_SECRET || 'change-this-in-production';

/**
 * Generates a secure payload for QR code
 * Implements the secure ID generation algorithm from task.md
 */
export function generateSecureId(attendeeData: { email: string; name: string }, eventSecret: string): string {
  // Step 1: Create a base string using attendee data
  const baseString = `${attendeeData.email}|${attendeeData.name}|${Date.now()}`;
  
  // Step 2: Generate a deterministic component using HMAC
  const deterministicComponent = crypto
    .createHmac('sha256', eventSecret)
    .update(baseString)
    .digest('hex')
    .substring(0, 8);
  
  // Step 3: Add entropy with a random component
  const randomComponent = crypto.randomBytes(4).toString('hex');
  
  // Step 4: Combine components with a version identifier
  const rawId = `1:${deterministicComponent}:${randomComponent}`;
  
  // Step 5: Generate a verification signature
  const signature = crypto
    .createHmac('sha256', eventSecret)
    .update(rawId)
    .digest('hex')
    .substring(0, 8);
  
  // Step 6: Combine everything into the final ID
  return `${rawId}:${signature}`;
}

/**
 * Generates a secure QR code with tamper-proof features
 */
export async function generateSecureQRCode(attendeeId: string, eventSecret: string = QR_SECRET): Promise<string> {
  // Create payload with expiration
  const payload = {
    id: attendeeId,
    exp: Date.now() + (24 * 60 * 60 * 1000), // 24-hour validity
    nonce: crypto.randomBytes(8).toString('hex')
  };
  
  // Sign the payload
  const signature = crypto
    .createHmac('sha256', eventSecret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  // Combine payload and signature
  const securePayload = {
    ...payload,
    sig: signature
  };
  
  // Encrypt the entire payload for additional security
  const encryptedPayload = encryptData(JSON.stringify(securePayload), eventSecret);
  
  // Generate actual QR code with the encrypted data
  return QRCode.toDataURL(encryptedPayload);
}

/**
 * Verifies a QR code by decrypting and validating its data
 */
export function verifyQRCode(encryptedData: string, eventSecret?: string): {
  valid: boolean;
  attendeeId?: string;
  reason?: string;
} {
  try {
    // Use the default secret if none provided
    const secretKey = eventSecret || QR_SECRET;
    
    // Decrypt the data
    const decrypted = decryptData(encryptedData, secretKey);
    const data = JSON.parse(decrypted);
    
    // Extract signature for verification
    const { sig, ...payloadToVerify } = data;
    
    // Regenerate signature
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(JSON.stringify(payloadToVerify))
      .digest('hex');
    
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
    console.error('QR verification error:', error instanceof Error ? error.message : 'Unknown error');
    return { valid: false, reason: 'Corrupted QR code' };
  }
}

/**
 * Encrypts data using AES-256-GCM
 */
export function encryptData(text: string, key: string): string {
  // Generate a derived key of appropriate length using PBKDF2
  const derivedKey = crypto.pbkdf2Sync(
    key,
    'salt',  // In production, use a proper salt strategy
    10000,   // Number of iterations
    32,      // Key length in bytes (256 bits)
    'sha256'
  );
  
  // Generate initialization vector
  const iv = crypto.randomBytes(16);
  
  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  
  // Encrypt the data
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get auth tag
  const authTag = cipher.getAuthTag();
  
  // Return IV + Auth Tag + Encrypted data, all as hex
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts data using AES-256-GCM
 */
export function decryptData(encryptedText: string, key: string): string {
  try {
    // Generate a derived key of appropriate length using PBKDF2
    const derivedKey = crypto.pbkdf2Sync(
      key,
      'salt',  // Should match the salt used for encryption
      10000,   // Should match iterations used for encryption
      32,      // Key length in bytes (256 bits)
      'sha256'
    );
    
    // Split the input into IV, Auth Tag, and encrypted data
    const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
    
    // Convert hex strings back to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generates a regular (non-encrypted) QR code as a Data URL
 */
export async function generateSimpleQRCode(data: string): Promise<string> {
  return QRCode.toDataURL(data);
} 