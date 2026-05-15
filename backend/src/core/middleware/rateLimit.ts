import { rateLimit, type Options } from 'express-rate-limit';
import { sendError } from '../utils/apiResponse.js';
import { HttpStatus } from '../constants/http.js';
import env from '../config/env.js';

function rateLimitHandler(
  _req: Parameters<NonNullable<Options['handler']>>[0],
  res: Parameters<NonNullable<Options['handler']>>[1]
): void {
  sendError(
    res,
    'Too many requests. Please try again later.',
    'TOO_MANY_REQUESTS',
    HttpStatus.TOO_MANY_REQUESTS
  );
}

/**
 * Global rate limiter — applied to every route
 * 200 requests per 15 minutes per IP
 */
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Strict rate limiter for sensitive auth endpoints (login, register, social)
 * 10 req/15min in production — relaxed to 1000 in development
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 1000 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});
