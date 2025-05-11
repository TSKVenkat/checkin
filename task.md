Master Implementation Plan: Event Tracker for SNUCC Hackathon
Project Vision
We'll create an advanced event management system called "CheckIn" that not only meets the core requirements of attendee tracking but incorporates sophisticated security measures and innovative features focused on emergency response and resource optimization. This application will stand out through its unique approach to identifier generation, comprehensive functionality, and robust security architecture.
System Architecture
Technology Stack
Frontend:

Next.js framework with TypeScript for type safety
TailwindCSS for responsive design
React Query for efficient data fetching and caching
PWA capabilities for offline functionality

Backend:

Next.js API routes for serverless functions
MongoDB for primary database
Redis for caching and real-time data
WebSockets for live updates and emergency communications

Security:

JWT with refresh token rotation for authentication
End-to-end encryption for sensitive data
Signed and encrypted QR codes
Rate limiting and request validation middleware

Core Features Implementation
1. Cryptographically Secure Attendee Identifiers
Our identifier system will use a multi-layered approach that combines:

Deterministic component derived from attendee data (hashed)
Time-based component for temporal uniqueness
Random entropy element to prevent prediction
Digital signature to verify authenticity

These IDs will be encoded as high-density QR codes with error correction and tamper-evident properties. Each QR code will contain:

The unique identifier
A time-based validity component
A cryptographic signature using HMAC-SHA256
Version identifier for future compatibility

2. Secure CSV Processing Pipeline
The CSV import process will:

Validate and sanitize all incoming data
Detect and handle duplicate entries
Generate secure identifiers for each attendee
Create cryptographically signed QR codes
Store encrypted attendee records in the database
Generate backup files of the mappings between attendees and identifiers

3. Multi-Factor Check-in System
The check-in process will incorporate:

Primary verification via QR code scanning
Secondary verification option with manual ID entry
Duplicate check-in detection with real-time alerts
Timestamp and location logging for audit purposes

4. Distributed Resource Allocation System
The lunch/kit distribution tracking will include:

Verification of prior check-in before allowing resource claims
Prevention of duplicate claims with immediate feedback
Offline caching of distribution data with sync capabilities
Real-time inventory tracking of available resources

5. Comprehensive Analytics Dashboard
The central dashboard will provide:

Real-time statistics on registrations, check-ins, and distributions
Searchable and filterable attendee records
Data visualization of event patterns and resource usage
Export functionality for reports and data analysis
Admin controls for system management

Bonus Features Implementation
1. Emergency Response System
This critical feature set will include:

One-Click Mass Communication

Instant push notifications to all attendees
Pre-configured emergency templates

Digital Safety Check-In

Quick "I'm safe" response mechanism for attendees

Resource Allocation Engine

inventory/ distribution items shortages, maybe when count doesnt match
Automatic alerts when supplies reach critical thresholds


Staffing Optimization

Real-time queue length monitoring

3. Offline Resilience System
To ensure functionality in disconnected environments:

Progressive Web App Implementation

Service workers for offline functionality
Local storage of critical data
Background synchronization when connectivity returns


Multi-Instance Consensus Protocol

Conflict resolution for offline changes
Timestamp-based reconciliation
Transaction logs for audit purposes
Peer-to-peer sync capabilities when central server is unavailable



Security Implementation
1. Authentication & Authorization

Token-Based Security

Short-lived JWTs (15 minute expiration)
HTTP-only, secure, SameSite=strict cookies for refresh tokens
One-time use refresh tokens with automatic rotation
Role-based access control with principle of least privilege


Session Management

Concurrent session limitations
Automatic session termination after periods of inactivity
Session logs for audit purposes



2. Data Protection

End-to-End Encryption

AES-256-GCM for data encryption
RSA for key exchange
Perfect forward secrecy implementation
Encrypted database fields for sensitive information


Tamper-Proof QR Codes

HMAC signatures for verification
Time-based components to prevent replay attacks
Single-use verification to prevent sharing
Built-in expiration mechanisms



3. API Hardening

Request Protection

Input validation and sanitization of all parameters
Rate limiting on critical endpoints
Request signing for sensitive operations
API versioning for controlled evolution


Security Headers

Content Security Policy implementation
Strict Transport Security enforcement
XSS Protection headers
Frame and content type protections


Comprehensive Audit Logging

Immutable logs of all security events
Real-time monitoring for security incidents



Implementation Phases
Phase 1: Foundation 

Project setup with Next.js and TypeScript
Database schema design
Authentication system implementation
CSV processing engine development

Phase 2: Core Features 

QR code generation system
Check-in interface
Resource distribution tracking
Basic dashboard implementation

Phase 3: Offline Capabilities

Service worker configuration
Local storage implementation
Synchronization logic
Conflict resolution systems

Phase 4: Bonus Features 

Emergency response system
Multi-instance support
Enhanced security measures

Phase 5: Refinement 

UI/UX polish
Performance optimization
Comprehensive testing
Documentation preparation

Technical Details
Secure ID Generation
The ID generation algorithm will use a cryptographic approach:
typescript// This is the algorithm/pseudocode, not actual implementation
function generateSecureId(attendeeData, eventSecret) {
  // Step 1: Create a base string using attendee data
  const baseString = `${attendeeData.email}|${attendeeData.name}|${Date.now()}`;
  
  // Step 2: Generate a deterministic component using HMAC
  const deterministicComponent = hmacSha256(baseString, eventSecret).substr(0, 8);
  
  // Step 3: Add entropy with a random component
  const randomComponent = crypto.randomBytes(4).toString('hex');
  
  // Step 4: Combine components with a version identifier
  const rawId = `1:${deterministicComponent}:${randomComponent}`;
  
  // Step 5: Generate a verification signature
  const signature = hmacSha256(rawId, eventSecret).substr(0, 8);
  
  // Step 6: Combine everything into the final ID
  return `${rawId}:${signature}`;
}
Database Schema
typescript// Attendee Schema
interface Attendee {
  _id: ObjectId;
  name: string;
  email: string;
  phone: string;
  role: string;
  uniqueId: string;        // Secure identifier
  qrCodeUrl: string;       // Path to generated QR code
  registrationStatus: {
    isCheckedIn: boolean;
    checkedInAt: Date;
    checkedInBy: ObjectId; // Reference to staff member
    checkedInLocation: string;
  };
  resourceClaims: {
    lunch: {
      claimed: boolean;
      claimedAt: Date;
      claimedBy: ObjectId; // Reference to staff member
      claimedLocation: string;
    };
    kit: {
      claimed: boolean;
      claimedAt: Date;
      claimedBy: ObjectId; // Reference to staff member
      claimedLocation: string;
    };
  };
  emergencyStatus: {
    lastKnownCheckIn: Date;
    safetyConfirmed: boolean;
    safetyConfirmedAt: Date;
    currentZone: string;
  };
  // For multi-day events
  dailyRecords: [{
    date: Date;
    checkedIn: boolean;
    checkedInAt: Date;
    lunchClaimed: boolean;
    lunchClaimedAt: Date;
    kitClaimed: boolean;
    kitClaimedAt: Date;
  }];
  // For audit purposes
  createdAt: Date;
  updatedAt: Date;
  version: number;         // For optimistic concurrency control
}

// Staff Schema
interface Staff {
  _id: ObjectId;
  name: string;
  email: string;
  role: string;            // admin, check-in, distribution, etc.
  permissions: string[];   // Fine-grained permissions
  authData: {
    passwordHash: string;  // Stored securely
    lastLogin: Date;
    activeSessions: [{
      token: string;       // Hashed refresh token
      device: string;
      expiresAt: Date;
    }];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Event Schema
interface Event {
  _id: ObjectId;
  name: string;
  startDate: Date;
  endDate: Date;
  locations: [{
    name: string;
    type: string;          // check-in, lunch, etc.
    capacity: number;
  }];
  resources: [{
    name: string;
    type: string;          // lunch, kit, etc.
    totalQuantity: number;
    claimedQuantity: number;
    lowThreshold: number;  // For alerts
  }];
  emergencyStatus: {
    isActive: boolean;
    type: string;          // fire, medical, etc.
    affectedZones: string[];
    activatedAt: Date;
    activatedBy: ObjectId;
    lastUpdated: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
API Endpoints
typescript// Authentication Routes
POST   /api/auth/login          // Staff login
POST   /api/auth/refresh        // Refresh authentication token
POST   /api/auth/logout         // Explicit logout

// Attendee Management Routes
POST   /api/attendees/upload    // Upload and process CSV
GET    /api/attendees           // List all attendees (with pagination/filtering)
GET    /api/attendees/:id       // Get specific attendee details
POST   /api/attendees/check-in  // Register attendee check-in
POST   /api/attendees/resource  // Record resource distribution

// Event Management Routes
GET    /api/events/stats        // Get event statistics
POST   /api/events/emergency    // Activate/deactivate emergency mode
POST   /api/events/broadcast    // Send notification to attendees

// Resource Management Routes
GET    /api/resources           // Get resource inventory status
POST   /api/resources/predict   // Get resource prediction analysis
POST   /api/resources/alert     // Configure resource alerts

// System Routes
GET    /api/system/health       // System health check
POST   /api/system/sync         // Force synchronization between instances
Security Implementations
Tamper-Proof QR Code System
typescript// QR Code Generation
function generateSecureQRCode(attendeeId, eventSecret) {
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
  const encrypted = encryptData(JSON.stringify(securePayload), eventSecret);
  
  // Generate actual QR code with the encrypted data
  return generateQR(encrypted);
}

// QR Code Verification
function verifyQRCode(encryptedData, eventSecret) {
  try {
    // Decrypt the data
    const decrypted = decryptData(encryptedData, eventSecret);
    const data = JSON.parse(decrypted);
    
    // Extract signature for verification
    const { sig, ...payloadToVerify } = data;
    
    // Regenerate signature
    const expectedSignature = crypto
      .createHmac('sha256', eventSecret)
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
    return { valid: false, reason: 'Corrupted QR code' };
  }
}
Rate Limiting Implementation
typescript// Rate limiting middleware for sensitive endpoints
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// General API rate limiting
export const apiLimiter = rateLimit({
  store: new RedisStore({
    // Use Redis to share limits across instances
    client: redisClient,
    prefix: 'rate-limit:api:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // Limit each IP to 100 requests per window
  standardHeaders: true,    // Return rate limit info in headers
  legacyHeaders: false      // Disable X-RateLimit headers
});

// More strict limits for authentication attempts
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:auth:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                   // 5 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    status: 429,
    message: 'Too many login attempts, please try again later'
  }
});
CSRF Protection
typescript// CSRF Protection Middleware
import { csrf } from 'next-csrf';

// Configure options
const csrfOptions = {
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production'
  },
  tokenKey: '__csrf',
  cookieName: '__Host-csrf',
  secretKey: process.env.CSRF_SECRET,
  tokenLength: 64
};

// Apply to API routes
export default csrf(csrfOptions);
User Flows
Event Administrator Flow

Initial Setup

Login to the admin dashboard
Create event parameters and settings
Upload CSV file with attendee data
Generate and download QR codes for distribution


Monitoring

View real-time check-in statistics
Monitor resource distribution
Receive alerts on low inventory or unusual patterns
Generate reports for analysis


Emergency Management

Activate emergency protocols when needed
Send mass communications to attendees
Monitor safety check-ins during incidents
Generate post-incident reports



Check-in Staff Flow

Initialization

Login to assigned check-in station
Synchronize with central database
Enable offline mode if needed


Attendee Processing

Scan attendee QR code
Verify identity if required
Confirm check-in with visual/audio feedback
Handle exceptions with supervisor override



Resource Distribution Staff Flow

Station Setup

Login to assigned distribution point
Review available inventory
Configure distribution parameters


Distribution Process

Scan attendee QR code
Verify eligibility (checked-in status)
Confirm resource distribution
Handle exceptions with supervisor override



Attendee Flow

Pre-event

Receive QR code via email or physical printout
Optional: download companion app for event information


Check-in

Present QR code at check-in desk
Receive confirmation of successful check-in
Get event-specific information


Resource Access

Present QR code at distribution points
Receive lunch, kit, or other resources
Get confirmation of successful distribution


Emergency Scenario

Receive emergency notifications
Follow digital guidance for evacuation
Mark themselves as safe through the system

Differentiation Points
This solution stands out in several key areas:

Cryptographic Security: Beyond basic authentication, we implement tamper-proof identifiers that can be verified even offline.
Emergency Responsiveness: Unlike standard event management systems, our solution includes comprehensive emergency protocols.
Predictive Intelligence: The system doesn't just track resources but actively predicts needs and optimizes distribution.
Offline Resilience: Full functionality during connection outages with intelligent synchronization protocols.
Multi-Station Consistency: Guaranteed data consistency between stations even in challenging network environments.

Evaluation Criteria Fulfillment
Originality

Novel approach to identifier generation using cryptographic techniques
Innovative emergency response integration rarely seen in event management
Creative use of predictive algorithms for resource optimization

Functionality Completeness

Exceeds core requirements with comprehensive tracking systems
Addresses all bonus suggestions from the problem statement
Adds critical features not explicitly mentioned but valuable to event operation

Creativity in Identifier Generation

Multi-layered secure identifier system
Tamper-evident QR codes with built-in expiration
Verification possible even when offline
Protection against common forgery techniques

Code Quality

Type-safe implementation with TypeScript
Clear separation of concerns in architecture
Comprehensive error handling
Detailed logging for auditing and debugging
Maintainable structure following best practices

Bonus Features

Comprehensive offline functionality
Multi-station synchronization
Emergency response system
Multi-day event support