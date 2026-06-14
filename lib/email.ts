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

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}

async function sendResetEmail(
  to: string,
  subject: string,
  greeting: string,
  resetUrl: string,
  context: string,
): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`Email not configured — ${context}:`, resetUrl);
    return false;
  }

  const from = process.env.SMTP_FROM || `noreply@${SITE_URL.replace(/^https?:\/\//, '')}`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #0d9488;">${SITE_NAME} Password Reset</h2>
          <p>Hi ${greeting},</p>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2dd4bf;color:#042f2e;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">Reset Password</a>
          <p style="color:#64748b;font-size:13px;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (emailErr) {
    console.error(`Email send failed (${context}):`, emailErr);
    return false;
  }
}

export async function sendPasswordResetEmail(
  to: string,
  memberName: string,
  token: string
): Promise<boolean> {
  return sendResetEmail(
    to,
    `${SITE_NAME} — Password Reset`,
    memberName,
    `${SITE_URL}/reset-password/${token}`,
    'member password reset link',
  );
}

export async function sendApartmentPasswordResetEmail(
  to: string,
  registrantName: string,
  apartmentName: string,
  token: string
): Promise<boolean> {
  return sendResetEmail(
    to,
    `${SITE_NAME} — Apartment Password Reset`,
    registrantName,
    `${SITE_URL}/reset-apartment-password/${token}`,
    `apartment password reset link for ${apartmentName}`,
  );
}

async function sendBrandedEmail(
  to: string,
  subject: string,
  htmlBody: string,
  context: string,
): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`Email not configured — ${context}`);
    return false;
  }

  const from = process.env.SMTP_FROM || `noreply@${SITE_URL.replace(/^https?:\/\//, '')}`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto;">
          <h2 style="color: #0d9488;">${SITE_NAME}</h2>
          ${htmlBody}
          <p style="color:#64748b;font-size:13px;margin-top:24px;">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (emailErr) {
    console.error(`Email send failed (${context}):`, emailErr);
    return false;
  }
}

export async function sendRegistrationWelcomeEmail(params: {
  to: string;
  registrantName: string;
  apartmentName: string;
  registrationId: string;
  apartmentPassword: string;
  memberDefaultPassword: string;
}): Promise<boolean> {
  const loginUrl = `${SITE_URL}/login`;
  const settingsUrl = `${SITE_URL}/settings`;

  return sendBrandedEmail(
    params.to,
    `${SITE_NAME} — Apartment Registered`,
    `
      <p>Hi ${params.registrantName},</p>
      <p>Your apartment <strong>${params.apartmentName}</strong> has been registered successfully on ${SITE_NAME}.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#64748b;">Registration ID</td><td style="padding:8px 0;font-weight:600;">${params.registrationId}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Apartment Name</td><td style="padding:8px 0;font-weight:600;">${params.apartmentName}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Apartment Password</td><td style="padding:8px 0;font-weight:600;">${params.apartmentPassword}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Member PIN (default)</td><td style="padding:8px 0;font-weight:600;">${params.memberDefaultPassword}</td></tr>
      </table>
      <p>Use your Registration ID or apartment name with the apartment password to sign in.</p>
      <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#2dd4bf;color:#042f2e;text-decoration:none;border-radius:8px;font-weight:600;margin:8px 0;">Sign In</a>
      <p style="font-size:13px;color:#64748b;">After signing in, complete your setup at <a href="${settingsUrl}" style="color:#0d9488;">Settings</a>.</p>
    `,
    `registration welcome for ${params.apartmentName}`,
  );
}

const BUG_REPORT_TO = 'shimato.rehman.bd@gmail.com';

export async function sendBugReportEmail(params: {
  apartmentName: string;
  reporterName: string;
  reporterEmail?: string | null;
  description: string;
  pageUrl?: string;
}): Promise<boolean> {
  const transporter = getTransporter();
  const subject = `[${SITE_NAME}] Bug report — ${params.apartmentName}`;
  const text = [
    `Apartment: ${params.apartmentName}`,
    `Reporter: ${params.reporterName}`,
    params.reporterEmail ? `Email: ${params.reporterEmail}` : null,
    params.pageUrl ? `Page: ${params.pageUrl}` : null,
    '',
    params.description,
  ]
    .filter(Boolean)
    .join('\n');

  if (!transporter) {
    console.warn('Bug report (email not configured):', text);
    return false;
  }

  const from = process.env.SMTP_FROM || `noreply@${SITE_URL.replace(/^https?:\/\//, '')}`;

  try {
    await transporter.sendMail({
      from,
      to: BUG_REPORT_TO,
      subject,
      text,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px;">
          <h2 style="color: #0d9488;">${SITE_NAME} — Bug Report</h2>
          <p><strong>Apartment:</strong> ${params.apartmentName}</p>
          <p><strong>Reporter:</strong> ${params.reporterName}</p>
          ${params.reporterEmail ? `<p><strong>Email:</strong> ${params.reporterEmail}</p>` : ''}
          ${params.pageUrl ? `<p><strong>Page:</strong> ${params.pageUrl}</p>` : ''}
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="white-space: pre-wrap; line-height: 1.6;">${params.description.replace(/</g, '&lt;')}</p>
        </div>
      `,
    });
    return true;
  } catch (emailErr) {
    console.error('Bug report email send failed:', emailErr);
    return false;
  }
}
