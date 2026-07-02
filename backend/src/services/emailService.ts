import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup email transport
const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '2525');
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || 'no-reply@connect.chat';

let transporter: nodemailer.Transporter | null = null;

if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
  logger.info('Nodemailer SMTP Transporter initialized successfully');
} else {
  logger.warn('SMTP settings missing. Nodemailer will write emails to local logs and upload files instead');
}

export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    if (transporter) {
      await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html
      });
      logger.info(`Email sent to ${to}: ${subject}`);
      return true;
    } else {
      // Mock Fallback
      logger.info(`===== [MOCK EMAIL] =====`);
      logger.info(`To: ${to}`);
      logger.info(`Subject: ${subject}`);
      logger.info(`Body snippet: ${html.substring(0, 300)}...`);
      logger.info(`=========================`);

      // Write email file to disk for debugging
      const emailDir = path.join(__dirname, '../../uploads/emails');
      if (!fs.existsSync(emailDir)) {
        fs.mkdirSync(emailDir, { recursive: true });
      }

      const fileName = `${Date.now()}-${to.replace(/[@.]/g, '_')}.html`;
      fs.writeFileSync(path.join(emailDir, fileName), html);
      logger.info(`Local email saved to: backend/uploads/emails/${fileName}`);
      return true;
    }
  } catch (error: any) {
    logger.error(`Error sending email: ${error.message}`);
    return false;
  }
};

export const sendVerificationEmail = async (email: string, username: string, token: string): Promise<boolean> => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #6366f1; text-align: center;">Welcome to Connect, ${username}!</h2>
      <p style="color: #334155; font-size: 16px;">Thank you for registering. Please verify your email address to unlock your account and begin chatting.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Verify Email Address</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <p style="color: #6366f1; word-break: break-all; font-size: 14px;">${verifyUrl}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you did not sign up for a Connect account, you can safely ignore this email.</p>
    </div>
  `;
  return sendEmail(email, 'Verify Your Email - Connect', html);
};

export const sendResetPasswordEmail = async (email: string, username: string, token: string): Promise<boolean> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #6366f1; text-align: center;">Reset Your Password</h2>
      <p style="color: #334155; font-size: 16px;">Hello ${username}, we received a request to reset your password for your Connect account. Click the button below to choose a new password.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <p style="color: #6366f1; word-break: break-all; font-size: 14px;">${resetUrl}</p>
      <p style="color: #e11d48; font-size: 13px; font-weight: 500;">Please note that this link is only valid for 1 hour.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
    </div>
  `;
  return sendEmail(email, 'Reset Your Password - Connect', html);
};
