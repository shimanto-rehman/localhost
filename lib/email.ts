import nodemailer from 'nodemailer';
import { SITE_NAME, SITE_URL } from './constants';

function getTransporter() {
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });
  }

  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return null;
}

export async function sendPasswordResetEmail(
  to: string,
  memberName: string,
  token: string
): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('Email not configured — password reset link:', `${SITE_URL}/reset-password/${token}`);
    return false;
  }

  const resetUrl = `${SITE_URL}/reset-password/${token}`;
  const from = process.env.SMTP_FROM || `noreply@${SITE_URL.replace(/^https?:\/\//, '')}`;

  await transporter.sendMail({
    from,
    to,
    subject: `${SITE_NAME} — Password Reset`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0d9488;">${SITE_NAME} Password Reset</h2>
        <p>Hi ${memberName},</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2dd4bf;color:#042f2e;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">Reset Password</a>
        <p style="color:#64748b;font-size:13px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });

  return true;
}
