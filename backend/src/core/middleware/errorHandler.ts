import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { createLogger } from '../utils/logger.js';
import { sendError } from '../utils/apiResponse.js';
import { HttpStatus } from '../constants/http.js';

const log = createLogger('ErrorHandler');

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      log.error({ err }, err.message);
    } else {
      log.warn({ code: err.code }, err.message);
    }

    sendError(res, err.message, err.code, err.statusCode);
    return;
  }

  log.error({ err }, 'Unhandled error');
  sendError(
    res,
    'Something went wrong',
    'INTERNAL_ERROR',
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}
