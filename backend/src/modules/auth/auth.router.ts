import { Router } from 'express';
import { register, login, refresh, logout, me } from './auth.controller.js';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema.js';
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

// GET /api/auth/me
router.get('/me', authenticate, me);

export default router;
