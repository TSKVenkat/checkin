# CheckIn - Modern Event Management System

A comprehensive, secure check-in and resource distribution management system for events with robust security features and real-time monitoring capabilities.

### Originality
- **Custom QR Code Security System**: Implements a unique, tamper-proof QR code generation system with multiple security layers.
- **Real-time Emergency Alert System**: Features a sophisticated emergency broadcast system with location-based evacuations and safety confirmations.
- **Multi-day Event Management**: Handles complex multi-day events with daily tracking of check-ins and resource distribution.

### Functionality Completeness
- **End-to-End Event Management**: Full lifecycle management from attendee registration to post-event analytics.
- **Role-based System**: Granular permission system with admin, manager, staff, and attendee roles.
- **Comprehensive Dashboards**: Real-time analytics and monitoring for all user roles.
- **Resource Distribution Tracking**: Complete inventory management and distribution monitoring.

### Creativity in Implementation
- **Intelligent ID Generation**: Uses a combination of deterministic and random components for secure, collision-resistant ID generation.
- **Advanced Security Mechanisms**: QR codes with AES-256-GCM encryption and HMAC signatures with constant-time comparison for tamper detection.
- **Websocket Real-time Updates**: Instant notifications and updates across connected clients.
- **Adaptive UI**: Context-aware interfaces that adapt to different user roles and device types.

### Code Quality
- **Modern Architecture**: Next.js app with React frontend and Node.js API routes.
- **Database Design**: Comprehensive Prisma schema with efficient indexes and relations.
- **Security-First Approach**: Rigorous authentication, authorization, and input validation throughout.
- **Clean Code Practices**: Modular design, consistent error handling, and comprehensive logging.

### Bonus Features
- **Emergency Management System**: Complete emergency detection, notification, and safety confirmation system.
- **Multi-channel Notifications**: Email, in-app, and real-time alerts.
- **Two-Factor Authentication**: Additional security for staff accounts.
- **Resource Low-stock Alerts**: Proactive inventory management.
- **Comprehensive Activity Logging**: Full audit trail for all system activities.

## Security Features

The CheckIn system implements multi-layered security to protect attendee data and prevent unauthorized access:

### Authentication and Authorization
- **JWT-based Authentication**: Secure JSON Web Tokens with SHA-256 signatures.
- **Refresh Token Rotation**: One-time use refresh tokens with automatic rotation.
- **Role-based Access Control**: Precise permission definitions for different user roles.
- **IP and Device Binding**: Optional binding of sessions to specific devices or networks.

### Data Protection
- **AES-256-GCM Encryption**: Military-grade encryption for QR codes and sensitive data.
- **PBKDF2 Key Derivation**: 10,000 iteration key derivation for strong encryption keys.
- **HMAC-SHA256 Signatures**: Tamper-evident digital signatures for all QR codes.
- **Bcrypt Password Hashing**: Industry-standard password hashing with 12 rounds of salting.

### Anti-fraud Measures
- **Time-limited QR Codes**: All QR codes have embedded expiration timestamps.
- **Unique Nonce Values**: One-time use cryptographic nonces to prevent replay attacks.
- **Signature Verification**: Constant-time comparison for signature verification to prevent timing attacks.
- **Activity Logging**: Comprehensive audit trails for security analysis.

## Architecture

### Frontend
- **React & Next.js**: Server-side rendering for optimal performance and SEO.
- **TanStack Query**: Efficient data fetching and caching.
- **TypeScript**: Type-safe code preventing common bugs.
- **Tailwind CSS**: Responsive design with dark mode support.

### Backend
- **Next.js API Routes**: Serverless backend architecture.
- **Prisma ORM**: Type-safe database queries and migrations.
- **PostgreSQL**: Reliable relational database for data integrity.
- **WebSockets**: Real-time communication for live updates.

### Key System Components

#### Check-in System
- Scans QR codes with cryptographic verification
- Manual check-in with email/ID lookup
- Daily tracking for multi-day events
- Location-based check-ins for large venues

#### Resource Distribution
- Tracks lunch, welcome kits, and other resources
- Prevents duplicate claims
- Low inventory alerts
- Distribution analytics by location

#### Emergency Management
- Emergency detection and activation
- Multi-channel alert system
- Location-specific evacuation instructions
- Safety confirmation tracking

#### Reporting & Analytics
- Real-time dashboard for key metrics
- Attendance patterns and predictions
- Resource consumption analytics
- Comprehensive export options

## How It Works

1. **Attendee Registration**: Generates secure, encrypted QR codes unique to each attendee
2. **Check-in Process**: Staff scans or manually enters attendee details
3. **Resource Distribution**: Tracks all resource claims with verification
4. **Emergency Handling**: Provides real-time emergency notifications and tracks responses
5. **Analytics**: Collects and visualizes attendance and distribution data

## Security Implementation Details

The system implements multiple tamper-proof mechanisms:

- QR codes use AES-256-GCM encryption with authenticated encryption to detect any tampering attempts
- Each QR has embedded HMAC-SHA256 signatures to verify authenticity
- All database operations use transactions for consistency
- Every API endpoint implements input validation and sanitization
- Rate limiting prevents brute force attacks
- CSRF protection with token validation
- Content Security Policy headers to prevent XSS attacks

## Development

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database

### Setup
1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables in `.env`
4. Run the development server:
   ```
   npm run dev
   ```

### Database Setup
```
npx prisma migrate dev
npx prisma db seed
```

## Production Deployment
For production, ensure all secret keys are properly configured and use environment variables for:
- JWT_SECRET (high entropy random string)
- REFRESH_SECRET (separate high entropy key)
- QR_SECRET (unique secret for QR code encryption)
- DATABASE_URL (secure connection string)

## License
MIT
