import 'express';
import type { AuthUser } from '../common/types';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthUser;
      tenantId?: number | null;
    }
  }
}

export {};