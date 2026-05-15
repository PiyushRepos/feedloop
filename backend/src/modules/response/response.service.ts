import prisma from '../../prisma/client.js';
import { createLogger } from '../../core/utils/logger.js';
import {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} from '../../core/errors/AppError.js';
import type { RequestMeta } from '../../core/utils/requestMeta.js';
import type { SubmitResponseInput } from './response.schema.js';

const log = createLogger('ResponseService');

// ─── Shared selects ───────────────────────────────────────────────────────────

const responseSelect = {
  id: true,
  pollId: true,
  submittedAt: true,
  answers: {
    select: {
      id: true,
      questionId: true,
      selectedOptionId: true,
    },
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetches poll with all questions and their valid option IDs for answer validation.
 * Only selects what the response submission logic needs — no over-fetching.
 */
async function fetchActivePoll(slug: string) {
  const poll = await prisma.poll.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      requiresAuth: true,
      isAnonymous: true,
      expiresAt: true,
      maxResponses: true,
      questions: {
        select: {
          id: true,
          isRequired: true,
          options: { select: { id: true } },
        },
      },
    },
  });

  if (!poll) throw new NotFoundError('Poll not found');
  if (poll.status !== 'ACTIVE') {
    throw new BadRequestError('This poll is not currently accepting responses');
  }
  if (poll.expiresAt && poll.expiresAt < new Date()) {
    throw new BadRequestError('This poll has expired');
  }

  return poll;
}

/**
 * Validates submitted answers against the poll's questions and options:
 *  1. No duplicate questionIds in the submission
 *  2. All required questions have an answer
 *  3. Each selectedOptionId belongs to the stated questionId
 */
function validateAnswers(
  poll: Awaited<ReturnType<typeof fetchActivePoll>>,
  answers: SubmitResponseInput['answers']
) {
  // Build a lookup: questionId → Set of valid optionIds
  const questionMap = new Map(
    poll.questions.map((q) => [
      q.id,
      {
        isRequired: q.isRequired,
        optionIds: new Set(q.options.map((o) => o.id)),
      },
    ])
  );

  // 1. Duplicate question check
  const submittedQuestionIds = answers.map((a) => a.questionId);
  const uniqueIds = new Set(submittedQuestionIds);
  if (uniqueIds.size !== submittedQuestionIds.length) {
    throw new BadRequestError(
      'Duplicate answers for the same question are not allowed'
    );
  }

  // 2. Required questions answered
  for (const [qId, { isRequired }] of questionMap) {
    if (isRequired && !uniqueIds.has(qId)) {
      throw new BadRequestError(
        `Question ${qId} is required but was not answered`
      );
    }
  }

  // 3. Each selectedOptionId belongs to its stated question
  for (const answer of answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      throw new BadRequestError(
        `Question ${answer.questionId} does not belong to this poll`
      );
    }
    if (!question.optionIds.has(answer.selectedOptionId)) {
      throw new BadRequestError(
        `Option ${answer.selectedOptionId} does not belong to question ${answer.questionId}`
      );
    }
  }
}

/**
 * Checks for duplicate submissions before inserting.
 * - Authenticated: one response per user per poll (enforced by DB unique + pre-check for clear error)
 * - Anonymous: one response per IP per poll (best-effort; deduplication not guaranteed behind NAT)
 */
async function checkDuplicate(
  pollId: string,
  userId: string | undefined,
  ipAddress: string | null
) {
  if (userId) {
    const existing = await prisma.response.findUnique({
      where: { pollId_respondentId: { pollId, respondentId: userId } },
      select: { id: true },
    });
    if (existing)
      throw new ConflictError(
        'You have already submitted a response to this poll'
      );
    return;
  }

  // Anonymous dedup by IP
  if (ipAddress) {
    const existing = await prisma.response.findFirst({
      where: { pollId, respondentId: null, ipAddress },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError(
        'A response from your IP address has already been recorded'
      );
    }
  }
}

/**
 * After a new response is saved, check if maxResponses has been reached.
 * If so, automatically close the poll in the same DB round-trip.
 */
async function autoCloseIfMaxReached(
  pollId: string,
  maxResponses: number | null
) {
  if (!maxResponses) return;

  const count = await prisma.response.count({ where: { pollId } });
  if (count >= maxResponses) {
    await prisma.poll.update({
      where: { id: pollId },
      data: { status: 'CLOSED' },
    });
    log.info(
      { pollId, maxResponses, count },
      'Poll auto-closed: max responses reached'
    );
  }
}

// ─── Response operations ──────────────────────────────────────────────────────

async function submitResponse(
  slug: string,
  userId: string | undefined,
  input: SubmitResponseInput,
  meta: RequestMeta
) {
  const poll = await fetchActivePoll(slug);

  // Auth gate
  if (poll.requiresAuth && !userId) {
    throw new UnauthorizedError(
      'You must be logged in to respond to this poll'
    );
  }

  validateAnswers(poll, input.answers);

  await checkDuplicate(poll.id, userId, meta.ipAddress);

  // Create response + all answers atomically
  const response = await prisma.response.create({
    data: {
      pollId: poll.id,
      // Respect isAnonymous: do not store respondent identity even if logged in
      respondentId: poll.isAnonymous ? null : (userId ?? null),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      browser: meta.browser,
      os: meta.os,
      device: meta.device,
      country: meta.country,
      region: meta.region,
      city: meta.city,
      answers: {
        create: input.answers.map((a) => ({
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId,
        })),
      },
    },
    select: responseSelect,
  });

  log.info({ responseId: response.id, pollId: poll.id }, 'Response submitted');

  // Fire-and-forget auto-close check (does not affect the API response)
  autoCloseIfMaxReached(poll.id, poll.maxResponses).catch((err) =>
    log.error({ err, pollId: poll.id }, 'Auto-close check failed')
  );

  return response;
}

export const responseService = {
  submitResponse,
};
