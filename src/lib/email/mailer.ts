import nodemailer from 'nodemailer';

// Configure nodemailer with environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'password',
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false
  }
});

// For development or testing, use a mocked transporter if environment variables are not set
const isDevelopment = process.env.NODE_ENV === 'development';
const isTesting = process.env.NODE_ENV === 'test';

// Check if email settings are properly configured
const isEmailConfigured = 
  process.env.SMTP_HOST && 
  process.env.SMTP_USER && 
  process.env.SMTP_PASS;

// Mock transporter for development and testing
const mockTransporter = {
  sendMail: async (options: any) => {
    console.log('Email would be sent in production:');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('Content:', options.text || options.html);
    return { messageId: 'mock-id' };
  }
};

// Use mock transporter if needed or if email is not configured
const mailer = (!isEmailConfigured || isDevelopment || isTesting) ? mockTransporter : transporter;

/**
 * Send verification email with OTP
 */
export async function sendVerificationEmail(to: string, name: string, otp: string): Promise<boolean> {
  try {
    console.log(`Attempting to send verification email to ${to} for ${name} with OTP ${otp}`);
    console.log(`SMTP settings: Host=${process.env.SMTP_HOST}, User=${process.env.SMTP_USER}, From=${process.env.SMTP_FROM}`);
    
    const appName = process.env.SMTP_FROM_NAME || 'CheckIn';
    const subject = `Verify your ${appName} account`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Welcome to ${appName}!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for signing up. Please verify your email address by entering the following code:</p>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 24 hours.</p>
        <p>If you didn't sign up for an account, please ignore this email.</p>
        <p>Thank you,<br>The ${appName} Team</p>
      </div>
    `;
    
    const result = await mailer.sendMail({
      from: process.env.SMTP_FROM || `${appName} <noreply@example.com>`,
      to,
      subject,
      html,
    });
    
    console.log('Email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  try {
    const appName = process.env.SMTP_FROM_NAME || 'CheckIn';
    const subject = `Welcome to ${appName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Welcome to ${appName}!</h2>
        <p>Hello ${name},</p>
        <p>Your email has been verified successfully, and your account is now active.</p>
        <p>You can now log in and start using all the features of our event management system.</p>
        <p>Thank you for choosing ${appName}!</p>
        <p>Best regards,<br>The ${appName} Team</p>
      </div>
    `;
    
    await mailer.sendMail({
      from: process.env.SMTP_FROM || `${appName} <noreply@example.com>`,
      to,
      subject,
      html,
    });
    
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

/**
 * Send password reset email with OTP
 */
export async function sendPasswordResetEmail(to: string, name: string, otp: string): Promise<boolean> {
  try {
    const appName = process.env.SMTP_FROM_NAME || 'CheckIn';
    const subject = `Reset your ${appName} password`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password. Please use the following code to reset your password:</p>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email or contact support.</p>
        <p>Thank you,<br>The ${appName} Team</p>
      </div>
    `;
    
    await mailer.sendMail({
      from: process.env.SMTP_FROM || `${appName} <noreply@example.com>`,
      to,
      subject,
      html,
    });
    
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

/**
 * Send emergency alert to all users
 */
export async function sendEmergencyAlert(
  to: string[], 
  subject: string, 
  message: string, 
  emergencyType: string,
  affectedZones: string[]
): Promise<boolean> {
  try {
    const appName = process.env.SMTP_FROM_NAME || 'CheckIn';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; background-color: #ffebeb;">
        <h2 style="color: #d32f2f;">⚠️ EMERGENCY ALERT</h2>
        <p><strong>Type:</strong> ${emergencyType}</p>
        <p><strong>Affected Areas:</strong> ${affectedZones.join(', ')}</p>
        <p><strong>Message:</strong></p>
        <div style="background-color: #fff; padding: 15px; border-left: 5px solid #d32f2f; margin: 10px 0;">
          ${message}
        </div>
        <p>Please follow emergency protocols and staff instructions.</p>
        <p>This is an automated emergency alert from the ${appName} system.</p>
      </div>
    `;
    
    await mailer.sendMail({
      from: process.env.SMTP_FROM || `${appName} Emergency <emergency@example.com>`,
      to,
      subject: `⚠️ EMERGENCY: ${subject}`,
      html,
      priority: 'high',
    });
    
    return true;
  } catch (error) {
    console.error('Error sending emergency alert:', error);
    return false;
  }
}

/**
 * Send QR code to attendee
 */
export async function sendAttendeeQRCode(
  to: string,
  name: string,
  eventName: string,
  qrCodeDataUrl: string,
  uniqueId: string
): Promise<boolean> {
  try {
    const appName = process.env.SMTP_FROM_NAME || 'CheckIn';
    const subject = `Your ${eventName} QR Code`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Your Event Check-In QR Code</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering for ${eventName}. Below is your unique QR code for check-in:</p>
        <div style="text-align: center; margin: 20px 0;">
          <img src="${qrCodeDataUrl}" alt="QR Code" style="max-width: 250px; height: auto; border: 1px solid #ddd; padding: 10px;" />
        </div>
        <p><strong>Your Unique ID:</strong> ${uniqueId}</p>
        <p>Please bring this QR code with you (printed or on your phone) to the event for faster check-in.</p>
        <p>Looking forward to seeing you at the event!</p>
        <p>Best regards,<br>The ${appName} Team</p>
      </div>
    `;
    
    await mailer.sendMail({
      from: process.env.SMTP_FROM || `${appName} <noreply@example.com>`,
      to,
      subject,
      html,
      attachDataUrls: true,
    });
    
    return true;
  } catch (error) {
    console.error('Error sending QR code email:', error);
    return false;
  }
}

/**
 * Debug function to test email sending directly
 */
export async function sendTestEmail(to: string): Promise<boolean> {
  try {
    console.log(`Sending test email to ${to}`);
    console.log(`SMTP settings: Host=${process.env.SMTP_HOST}, User=${process.env.SMTP_USER}, From=${process.env.SMTP_FROM}`);
    
    const appName = process.env.SMTP_FROM_NAME || 'CheckIn';
    
    const result = await mailer.sendMail({
      from: process.env.SMTP_FROM || `${appName} <noreply@example.com>`,
      to,
      subject: 'Test Email from CheckIn',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">This is a test email</h2>
          <p>If you're seeing this, the email system is working correctly!</p>
          <p>Current time: ${new Date().toISOString()}</p>
          <p>Thank you for testing the system,<br>The ${appName} Team</p>
        </div>
      `,
    });
    
    console.log('Test email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Error sending test email:', error);
    return false;
  }
} 