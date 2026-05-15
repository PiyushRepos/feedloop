import type { RequestHandler } from 'express';
import { analyticsService } from './analytics.service.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import type { AuthenticatedRequest } from '../../core/middleware/authenticate.js';

// GET /api/polls/:slug/results
// Public when PUBLISHED; owner can preview at CLOSED status too
export const getPollResults: RequestHandler = asyncHandler(async (req, res) => {
  const { slug } = req.params as { slug: string };
  const userId = (req as AuthenticatedRequest).user?.id;
  const data = await analyticsService.getPollResults(slug, userId);
  sendSuccess(res, 'Results fetched successfully', data);
});

// GET /api/polls/:id/analytics
// Owner only — full geo + device + timeline breakdown
export const getPollAnalytics: RequestHandler = asyncHandler(
  async (req, res) => {
    const { id } = req.params as { id: string };
    const { id: userId } = (req as AuthenticatedRequest).user;
    const data = await analyticsService.getPollAnalytics(id, userId);
    sendSuccess(res, 'Analytics fetched successfully', data);
  }
);
