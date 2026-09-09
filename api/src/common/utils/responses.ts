import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ApiEnvelope, ListMeta } from '../types';

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const sendOk = <T>(
  res: Response,
  data: T,
  meta?: ListMeta,
  message?: string,
): Response<ApiEnvelope<T>> => {
  const body: ApiEnvelope<T> = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  if (message) body.message = message;
  return res.status(200).json(body);
};

export const sendCreated = <T>(res: Response, data: T, message?: string): Response => {
  const body: ApiEnvelope<T> = { success: true, data };
  if (message) body.message = message;
  return res.status(201).json(body);
};

export const sendAccepted = <T>(res: Response, data: T, message?: string): Response => {
  const body: ApiEnvelope<T> = { success: true, data };
  if (message) body.message = message;
  return res.status(202).json(body);
};

export const sendEmpty = (res: Response): Response => res.status(204).send();