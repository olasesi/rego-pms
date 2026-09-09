import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const requestContext = (req: Request, res: Response, next: NextFunction): void => {
  const existing = req.headers['x-request-id'];
  req.requestId = (typeof existing === 'string' && existing) || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};

export default requestContext;