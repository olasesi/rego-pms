import { Notification } from '../../models';
import { log } from '../../config/logger';
import { sendEmail } from './email';

export interface NotifyPayload {
  userId: number;
  orgId?: number | null;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  email?: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
  };
}

export async function notifyUser(payload: NotifyPayload): Promise<void> {
  try {
    await Notification.create({
      userId: payload.userId,
      orgId: payload.orgId ?? null,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
      metadata: payload.metadata ?? null,
      readAt: null,
    });
  } catch (err) {
    log.error('[notifications] failed to persist notification', { error: (err as Error).message });
  }

  if (payload.email) {
    await sendEmail(payload.email);
  }
}

export default notifyUser;