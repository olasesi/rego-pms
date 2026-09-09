import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../../config/env';
import { log } from '../../config/logger';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (!config.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: config.SMTP_USER
        ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
};

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    log.warn('[email] SMTP not configured; skipping email delivery', { to: message.to, subject: message.subject });
    return false;
  }
  try {
    await transport.sendMail({ from: config.SMTP_FROM, ...message });
    log.debug('[email] message sent', { to: message.to, subject: message.subject });
    return true;
  } catch (err) {
    log.error('[email] delivery failed', { error: (err as Error).message, to: message.to });
    return false;
  }
}

export default sendEmail;