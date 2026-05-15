import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  googleLogin,
  me,
} from './auth.controller.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  googleSchema,
} from './auth.schema.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { validate } from '../../core/middleware/validate.js';

const router: Router = Router();

// POST /api/auth/register
router.post('/register', validate('body', registerSchema), register);

// POST /api/auth/login
router.post('/login', validate('body', loginSchema), login);

// POST /api/auth/refresh
router.post('/refresh', validate('body', refreshSchema), refresh);

// POST /api/auth/logout
router.post('/logout', validate('body', refreshSchema), logout);

// POST /api/auth/social/google
router.post('/social/google', validate('body', googleSchema), googleLogin);

// GET /api/auth/me
router.get('/me', authenticate, me);

export default router;
