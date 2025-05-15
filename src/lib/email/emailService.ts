// Email service for sending OTPs, confirmation emails, etc.
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email configuration using environment variables
const smtpConfig = {
  service: process.env.SMTP_SERVICE || 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  secure: true, // Use SSL
  tls: {
    rejectUnauthorized: true, // Verify server certificate
  },
};

// Sender configuration
const from = {
  name: process.env.EMAIL_SENDER_NAME || 'CheckIn',
  email: process.env.SMTP_USER,
};

// Create transporter
const transporter = nodemailer.createTransport(smtpConfig);

/**
 * Send a verification email with OTP
 */
export async function sendVerificationEmail(email: string, otp: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"${from.name}" <${from.email}>`,
      to: email,
      subject: 'Email Verification Code',
      text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
      html: `
        <div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121212; color: #ffffff; padding: 20px; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #6366f1; margin-bottom: 5px;">Email Verification</h1>
            <p style="color: #a0a0a0; font-size: 16px;">Please verify your email to continue</p>
          </div>
          
          <div style="background-color: #1e1e1e; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #6366f1;">
            <p style="margin-bottom: 15px; color: #ffffff;">Please use the following code to verify your email address:</p>
            <div style="background-color: #2a2a2a; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 8px; color: #ffffff; border-radius: 4px; margin-bottom: 15px;">
              ${otp}
            </div>
            <p style="font-size: 14px; color: #a0a0a0;">This code will expire in 10 minutes</p>
          </div>
          
          <div style="background-color: #1e1e1e; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #a0a0a0; font-size: 14px;">
              <strong style="color: #6366f1;">Security Notice:</strong> If you did not request this code, please ignore this email or contact support if you're concerned about your account security.
            </p>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #333333; color: #a0a0a0; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} CheckIn. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

/**
 * Send a password reset email with OTP
 */
export async function sendPasswordResetEmail(email: string, otp: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"${from.name}" <${from.email}>`,
      to: email,
      subject: 'Password Reset Code',
      text: `Your password reset code is: ${otp}. This code will expire in 10 minutes.`,
      html: `
        <div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121212; color: #ffffff; padding: 20px; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #6366f1; margin-bottom: 5px;">Password Reset</h1>
            <p style="color: #a0a0a0; font-size: 16px;">We received a request to reset your password</p>
          </div>
          
          <div style="background-color: #1e1e1e; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #6366f1;">
            <p style="margin-bottom: 15px; color: #ffffff;">Please use the following code to reset your password:</p>
            <div style="background-color: #2a2a2a; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 8px; color: #ffffff; border-radius: 4px; margin-bottom: 15px;">
              ${otp}
            </div>
            <p style="font-size: 14px; color: #a0a0a0;">This code will expire in 10 minutes</p>
          </div>
          
          <div style="background-color: #1e1e1e; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #ff6b6b; font-size: 14px;">
              <strong>Important:</strong> If you did not request a password reset, please secure your account immediately by changing your password.
            </p>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #333333; color: #a0a0a0; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} CheckIn. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

/**
 * Send a welcome email after successful account creation
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"${from.name}" <${from.email}>`,
      to: email,
      subject: 'Welcome to CheckIn',
      text: `Hello ${name}, thank you for creating an account with CheckIn. Your account is now active.`,
      html: `
        <div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121212; color: #ffffff; padding: 20px; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #6366f1; margin-bottom: 5px;">Welcome to CheckIn!</h1>
            <p style="color: #a0a0a0; font-size: 16px;">Your event management journey begins now</p>
          </div>
          
          <div style="background-color: #1e1e1e; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin-bottom: 15px; color: #ffffff; font-size: 18px;">Hello ${name},</p>
            <p style="margin-bottom: 15px; color: #ffffff;">Thank you for creating an account with CheckIn. Your account is now active and you can start using our system.</p>
            <p style="margin-bottom: 15px; color: #ffffff;">With CheckIn, you can:</p>
            <ul style="color: #a0a0a0; padding-left: 20px; margin-bottom: 15px;">
              <li style="padding: 5px 0;">Manage event check-ins efficiently</li>
              <li style="padding: 5px 0;">Track attendee information securely</li>
              <li style="padding: 5px 0;">Distribute resources to attendees</li>
              <li style="padding: 5px 0;">Access real-time analytics and reporting</li>
            </ul>
            <p style="color: #ffffff;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          </div>
          
          <div style="background-color: #1e1e1e; text-align: center; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Log in to your account</a>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #333333; color: #a0a0a0; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} CheckIn. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
}

/**
 * Generate a stronger OTP with configurable length and type
 */
export function generateOTP(options: { length?: number; type?: 'numeric' | 'alphanumeric' } = {}): string {
  const length = options.length || 6;
  const type = options.type || 'numeric';
  
  if (type === 'numeric') {
    // Generate a random numeric OTP
    return crypto.randomInt(10 ** (length - 1), 10 ** length).toString();
  } else {
    // Generate a random alphanumeric OTP
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like I, O, 0, 1
    let otp = '';
    
    // Use crypto.randomBytes for better randomness
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      const index = randomBytes[i] % charset.length;
      otp += charset[index];
    }
    
    return otp;
  }
}

/**
 * Verify OTP with timing-safe comparison to prevent timing attacks
 */
export function verifyOTP(providedOTP: string, storedOTP: string): boolean {
  // Use timingSafeEqual to prevent timing attacks
  try {
    const providedBuffer = Buffer.from(String(providedOTP));
    const storedBuffer = Buffer.from(String(storedOTP));
    
    // If lengths are different, pad the shorter one to prevent timing differences
    if (providedBuffer.length !== storedBuffer.length) {
      const maxLength = Math.max(providedBuffer.length, storedBuffer.length);
      const paddedProvided = Buffer.alloc(maxLength, 0);
      const paddedStored = Buffer.alloc(maxLength, 0);
      
      providedBuffer.copy(paddedProvided);
      storedBuffer.copy(paddedStored);
      
      return crypto.timingSafeEqual(paddedProvided, paddedStored);
    }
    
    return crypto.timingSafeEqual(providedBuffer, storedBuffer);
  } catch (error) {
    console.error('OTP verification error:', error);
    return false;
  }
} 