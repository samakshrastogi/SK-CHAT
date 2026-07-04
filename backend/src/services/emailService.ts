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

const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

let transporter: nodemailer.Transporter | null = null;

if (smtpHost && smtpUser) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass || ''
    }
  });
  logger.info(`Nodemailer SMTP Transporter initialized successfully (Secure: ${smtpSecure})`);
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

export const sendVerificationOTP = async (email: string, username: string, otp: string): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #6366f1; text-align: center;">Welcome to Connect, ${username}!</h2>
      <p style="color: #334155; font-size: 16px;">Thank you for registering. Please use the following 6-digit One-Time Password (OTP) to verify your account:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="background-color: #f1f5f9; color: #6366f1; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 30px; border-radius: 8px; display: inline-block; border: 1px dashed #cbd5e1;">${otp}</span>
      </div>
      <p style="color: #e11d48; font-size: 13px; font-weight: 500; text-align: center;">This OTP code is valid for 24 hours.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you did not sign up for a Connect account, you can safely ignore this email.</p>
    </div>
  `;
  return sendEmail(email, 'Verify Your Email OTP - Connect', html);
};

export const sendResetPasswordOTP = async (email: string, username: string, otp: string): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #6366f1; text-align: center;">Reset Your Password</h2>
      <p style="color: #334155; font-size: 16px;">Hello ${username}, we received a request to reset your password. Please use the following 6-digit One-Time Password (OTP) code to verify your request:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="background-color: #f1f5f9; color: #6366f1; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 30px; border-radius: 8px; display: inline-block; border: 1px dashed #cbd5e1;">${otp}</span>
      </div>
      <p style="color: #e11d48; font-size: 13px; font-weight: 500; text-align: center;">This OTP code is valid for 1 hour.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
    </div>
  `;
  return sendEmail(email, 'Reset Password OTP - Connect', html);
};
