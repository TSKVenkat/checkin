// Email service for sending OTPs, confirmation emails, etc.
import nodemailer from 'nodemailer';

// Email configuration
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

// Sender configuration
const from = {
  name: process.env.SMTP_FROM_NAME || 'CheckIn System',
  email: process.env.SMTP_FROM || 'noreply@example.com',
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Please use the following code to verify your email address:</p>
          <div style="background-color: #f4f4f4; padding: 12px; font-size: 18px; font-weight: bold; text-align: center; letter-spacing: 5px;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>Please use the following code to reset your password:</p>
          <div style="background-color: #f4f4f4; padding: 12px; font-size: 18px; font-weight: bold; text-align: center; letter-spacing: 5px;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.</p>
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to CheckIn!</h2>
          <p>Hello ${name},</p>
          <p>Thank you for creating an account with CheckIn. Your account is now active and you can start using our system.</p>
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          <p>Best regards,<br/>The CheckIn Team</p>
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
 * Generate a random 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
} 