import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../utils/customError.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || undefined;

  // Log unexpected server errors
  if (statusCode === 500) {
    logger.error('unhandled_api_error', { requestId: res.locals.requestId, method: req.method, path: req.path, error: err });
  } else {
    logger.debug('api_error', { requestId: res.locals.requestId, method: req.method, path: req.path, statusCode, message });
  }

  // Handle Mongoose CastError / ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map((val: any) => val.message);
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid resource ID format: ${err.value}`;
  } else if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    requestId: res.locals.requestId,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
