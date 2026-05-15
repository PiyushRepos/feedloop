import type { RequestHandler } from 'express';
import { pollService } from './poll.service.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { HttpStatus } from '../../core/constants/http.js';
import type { AuthenticatedRequest } from '../../core/middleware/authenticate.js';
import type {
  CreatePollInput,
  UpdatePollInput,
  UpdateStatusInput,
} from './poll.schema.js';

// POST /api/polls
export const createPoll: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId } = (req as AuthenticatedRequest).user;
  const poll = await pollService.createPoll(
    userId,
    req.body as CreatePollInput
  );
  sendSuccess(res, 'Poll created successfully', { poll }, HttpStatus.CREATED);
});

// GET /api/polls/mine
export const getMyPolls: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId } = (req as AuthenticatedRequest).user;
  const polls = await pollService.getMyPolls(userId);
  sendSuccess(res, 'Polls fetched successfully', { polls });
});

// GET /api/polls/:slug  (public — no auth required)
export const getPollBySlug: RequestHandler = asyncHandler(async (req, res) => {
  const { slug } = req.params as { slug: string };
  // Pass userId if logged in so creator can preview their own DRAFT
  const userId = (req as AuthenticatedRequest).user?.id;
  const poll = await pollService.getPollBySlug(slug, userId);
  sendSuccess(res, 'Poll fetched successfully', { poll });
});

// GET /api/polls/:id/manage  (owner only, by UUID)
export const getPollById: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId } = (req as AuthenticatedRequest).user;
  const { id } = req.params as { id: string };
  const poll = await pollService.getPollById(id, userId);
  sendSuccess(res, 'Poll fetched successfully', { poll });
});

// PATCH /api/polls/:id  (owner, DRAFT only)
export const updatePoll: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId } = (req as AuthenticatedRequest).user;
  const { id } = req.params as { id: string };
  const poll = await pollService.updatePoll(
    id,
    userId,
    req.body as UpdatePollInput
  );
  sendSuccess(res, 'Poll updated successfully', { poll });
});

// PATCH /api/polls/:id/status  (owner, valid transitions only)
export const updateStatus: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId } = (req as AuthenticatedRequest).user;
  const { id } = req.params as { id: string };
  const poll = await pollService.updateStatus(
    id,
    userId,
    req.body as UpdateStatusInput
  );
  sendSuccess(res, 'Poll status updated', { poll });
});

// DELETE /api/polls/:id  (owner, not ACTIVE)
export const deletePoll: RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId } = (req as AuthenticatedRequest).user;
  const { id } = req.params as { id: string };
  await pollService.deletePoll(id, userId);
  sendSuccess(res, 'Poll deleted successfully', null);
});
