import type { RequestHandler } from 'express';
import { responseService } from './response.service.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { HttpStatus } from '../../core/constants/http.js';
import { extractRequestMeta } from '../../core/utils/requestMeta.js';
import type { AuthenticatedRequest } from '../../core/middleware/authenticate.js';
import type { SubmitResponseInput } from './response.schema.js';
import { getIO } from '../../core/ws/io.js';
import {
  broadcastPublicUpdate,
  broadcastOwnerUpdate,
} from '../../core/ws/pollHandler.js';

// POST /api/polls/:slug/responses
export const submitResponse: RequestHandler = asyncHandler(async (req, res) => {
  const { slug } = req.params as { slug: string };
  // userId is optional — anonymous respondents are allowed unless poll.requiresAuth
  const userId = (req as AuthenticatedRequest).user?.id;
  const meta = extractRequestMeta(req);

  const response = await responseService.submitResponse(
    slug,
    userId,
    req.body as SubmitResponseInput,
    meta
  );

  sendSuccess(
    res,
    'Response submitted successfully',
    { response },
    HttpStatus.CREATED
  );

  // Fire-and-forget broadcasts — never block the HTTP response
  const io = getIO();
  broadcastPublicUpdate(io, slug).catch(() => {});
  broadcastOwnerUpdate(io, slug).catch(() => {});
});
