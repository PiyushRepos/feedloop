import { Router } from 'express';
import {
  createPoll,
  getMyPolls,
  getPollBySlug,
  getPollById,
  updatePoll,
  updateStatus,
  deletePoll,
} from './poll.controller.js';
import {
  createPollSchema,
  updatePollSchema,
  updateStatusSchema,
  pollSlugSchema,
  pollIdSchema,
} from './poll.schema.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { validate } from '../../core/middleware/validate.js';
import responseRouter from '../response/response.router.js';

const router: Router = Router();

// POST /api/polls  — create a new poll (auth required)
router.post('/', authenticate, validate('body', createPollSchema), createPoll);

// GET /api/polls/mine  — list caller's polls (auth required)
router.get('/mine', authenticate, getMyPolls);

// GET /api/polls/:slug  — public poll view by slug
// authenticate is optional: passes user context if token present, skips if not
router.get(
  '/:slug',
  (req, res, next) => {
    // Soft auth: populate req.user when token is present but do NOT reject
    // if the token is missing — anonymous viewers must still reach the poll.
    authenticate(req, res, (err) => {
      // Ignore auth errors (missing/expired token); the handler handles undefined user
      if (err) return next();
      next();
    });
  },
  validate('params', pollSlugSchema),
  getPollBySlug
);

// GET /api/polls/:id/manage  — owner-only detail view by UUID
router.get(
  '/:id/manage',
  authenticate,
  validate('params', pollIdSchema),
  getPollById
);

// PATCH /api/polls/:id  — update poll metadata (DRAFT only)
router.patch(
  '/:id',
  authenticate,
  validate('params', pollIdSchema),
  validate('body', updatePollSchema),
  updatePoll
);

// PATCH /api/polls/:id/status  — advance poll status (DRAFT→ACTIVE→CLOSED→PUBLISHED)
router.patch(
  '/:id/status',
  authenticate,
  validate('params', pollIdSchema),
  validate('body', updateStatusSchema),
  updateStatus
);

// DELETE /api/polls/:id  — delete poll (not allowed when ACTIVE)
router.delete(
  '/:id',
  authenticate,
  validate('params', pollIdSchema),
  deletePoll
);

// POST /api/polls/:slug/responses  — submit a response (nested resource)
router.use('/:slug/responses', responseRouter);

export default router;
