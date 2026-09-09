import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  <P = Record<string, string>>(handler: AsyncHandler): RequestHandler<P> =>
  (req, res, next): void => {
    Promise.resolve(handler(req as Request, res, next)).catch(next);
  };

export default asyncHandler;