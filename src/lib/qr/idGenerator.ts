// Secure ID generation for attendees
import crypto from 'crypto';

interface AttendeeData {
  email: string;
  name: string;
  [key: string]: any;
}

/**
 * Generates a cryptographically secure ID for an attendee
 * The ID combines deterministic, time-based, and random components
 * with a cryptographic signature for verification
 */
export function generateSecureId(attendeeData: AttendeeData, eventSecret: string): string {
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
 * Verifies a secure ID to ensure it was generated properly
 * and hasn't been tampered with
 */
export function verifySecureId(secureId: string, eventSecret: string): boolean {
  try {
    // Split ID into components
    const parts = secureId.split(':');
    if (parts.length !== 4) return false;
    
    const [version, deterministicComponent, randomComponent, providedSignature] = parts;
    
    // Reconstruct raw ID for signature verification
    const rawId = `${version}:${deterministicComponent}:${randomComponent}`;
    
    // Regenerate signature
    const expectedSignature = crypto
      .createHmac('sha256', eventSecret)
      .update(rawId)
      .digest('hex')
      .substring(0, 8);
    
    // Verify signature matches
    return expectedSignature === providedSignature;
  } catch (error) {
    return false;
  }
}

/**
 * Extracts components from a secure ID for analysis or debugging
 */
export function parseSecureId(secureId: string): {
  version: string;
  deterministicComponent: string;
  randomComponent: string;
  signature: string;
} | null {
  try {
    const parts = secureId.split(':');
    if (parts.length !== 4) return null;
    
    const [version, deterministicComponent, randomComponent, signature] = parts;
    return {
      version,
      deterministicComponent,
      randomComponent,
      signature
    };
  } catch (error) {
    return null;
  }
} 