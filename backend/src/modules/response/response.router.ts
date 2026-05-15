import { Router } from 'express';
import { submitResponse } from './response.controller.js';
import { submitResponseSchema, responseSlugSchema } from './response.schema.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { validate } from '../../core/middleware/validate.js';

// Mounted at /api/polls/:slug/responses by app.ts
// Express mergeParams: true is required to access :slug from the parent router
const router: Router = Router({ mergeParams: true });

// POST /api/polls/:slug/responses
// Soft auth: logged-in users get identity recorded (unless poll.isAnonymous),
// anonymous users are allowed unless poll.requiresAuth blocks them in the service
router.post(
  '/',
  (req, res, next) => {
    authenticate(req, res, (err) => {
      if (err) return next(); // Missing/expired token is fine — service decides
      next();
    });
  },
  validate('params', responseSlugSchema),
  validate('body', submitResponseSchema),
  submitResponse
);

export default router;
