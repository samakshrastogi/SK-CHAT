import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.header('x-request-id')?.trim();
  const requestId = incoming && incoming.length <= 128 ? incoming : crypto.randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};
