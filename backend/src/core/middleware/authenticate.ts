import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/AppError.js';
import { verifyJwt } from '../utils/token.js';
import env from '../config/env.js';

export interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: string };
}

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * Verifies the Bearer access token on incoming requests.
 * On success, attaches `req.user` for downstream handlers.
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed authorization header');
    }

    const token = authHeader.slice(7);
    const payload = await verifyJwt<AccessTokenPayload>(
      token,
      env.JWT_ACCESS_SECRET
    );

    (req as AuthenticatedRequest).user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
};
