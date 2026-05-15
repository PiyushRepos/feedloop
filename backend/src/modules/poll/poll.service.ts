import { nanoid } from 'nanoid';
import prisma from '../../prisma/client.js';
import { createLogger } from '../../core/utils/logger.js';
import { slugify } from '../../core/utils/slugify.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../core/errors/AppError.js';
import type {
  CreatePollInput,
  UpdatePollInput,
  UpdateStatusInput,
} from './poll.schema.js';

const log = createLogger('PollService');

// ─── Status machine ───────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['CLOSED'],
  CLOSED: ['PUBLISHED'],
  PUBLISHED: [],
};

// ─── Shared selects ───────────────────────────────────────────────────────────

const pollWithQuestionsSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  isAnonymous: true,
  requiresAuth: true,
  status: true,
  expiresAt: true,
  maxResponses: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  creator: {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  },
  questions: {
    orderBy: { order: 'asc' as const },
    select: {
      id: true,
      text: true,
      isRequired: true,
      order: true,
      options: {
        orderBy: { order: 'asc' as const },
        select: { id: true, text: true, order: true },
      },
    },
  },
} as const;

const pollSummarySelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  status: true,
  isAnonymous: true,
  requiresAuth: true,
  expiresAt: true,
  maxResponses: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { responses: true, questions: true } },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a unique poll slug: "<slugified-title>-<6-char-nanoid>"
 * e.g. "favorite-color-ab12cd"
 */
async function generateUniqueSlug(title: string): Promise<string> {
  while (true) {
    const slug = `${slugify(title, { maxLength: 50, fallback: 'poll' })}-${nanoid(6)}`;
    const existing = await prisma.poll.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return slug;
  }
}

async function findPollOrThrow(id: string) {
  const poll = await prisma.poll.findUnique({
    where: { id },
    select: { id: true, creatorId: true, status: true },
  });
  if (!poll) throw new NotFoundError('Poll not found');
  return poll;
}

function assertOwner(poll: { creatorId: string }, userId: string) {
  if (poll.creatorId !== userId)
    throw new ForbiddenError('You do not own this poll');
}

// ─── Poll operations ──────────────────────────────────────────────────────────

async function createPoll(userId: string, input: CreatePollInput) {
  const slug = await generateUniqueSlug(input.title);

  const poll = await prisma.poll.create({
    data: {
      slug,
      title: input.title,
      description: input.description ?? null,
      isAnonymous: input.isAnonymous ?? false,
      requiresAuth: input.requiresAuth ?? false,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      maxResponses: input.maxResponses ?? null,
      creatorId: userId,
      questions: {
        create: input.questions.map((q) => ({
          text: q.text,
          isRequired: q.isRequired ?? true,
          order: q.order,
          options: {
            create: q.options.map((o) => ({
              text: o.text,
              order: o.order,
            })),
          },
        })),
      },
    },
    select: pollWithQuestionsSelect,
  });

  log.info({ pollId: poll.id, userId }, 'Poll created');
  return poll;
}

async function getMyPolls(userId: string) {
  return prisma.poll.findMany({
    where: { creatorId: userId },
    select: pollSummarySelect,
    orderBy: { createdAt: 'desc' },
  });
}

async function getPollBySlug(slug: string, userId?: string) {
  const poll = await prisma.poll.findUnique({
    where: { slug },
    select: pollWithQuestionsSelect,
  });

  if (!poll) throw new NotFoundError('Poll not found');

  // Non-creator cannot see DRAFT polls
  if (poll.status === 'DRAFT' && poll.creator.id !== userId) {
    throw new NotFoundError('Poll not found');
  }

  return poll;
}

async function getPollById(id: string, userId: string) {
  const poll = await prisma.poll.findUnique({
    where: { id },
    select: pollWithQuestionsSelect,
  });

  if (!poll) throw new NotFoundError('Poll not found');
  assertOwner({ creatorId: poll.creator.id }, userId);

  return poll;
}

async function updatePoll(id: string, userId: string, input: UpdatePollInput) {
  const poll = await findPollOrThrow(id);
  assertOwner(poll, userId);

  if (poll.status !== 'DRAFT') {
    throw new BadRequestError('Only draft polls can be edited');
  }

  const data: Parameters<typeof prisma.poll.update>[0]['data'] = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.isAnonymous !== undefined) data.isAnonymous = input.isAnonymous;
  if (input.requiresAuth !== undefined) data.requiresAuth = input.requiresAuth;
  if (input.maxResponses !== undefined) data.maxResponses = input.maxResponses;
  if (input.expiresAt !== undefined) data.expiresAt = new Date(input.expiresAt);

  return prisma.poll.update({
    where: { id },
    data,
    select: pollWithQuestionsSelect,
  });
}

async function updateStatus(
  id: string,
  userId: string,
  input: UpdateStatusInput
) {
  const poll = await findPollOrThrow(id);
  assertOwner(poll, userId);

  const allowed = VALID_TRANSITIONS[poll.status] ?? [];
  if (!allowed.includes(input.status)) {
    throw new BadRequestError(
      `Cannot transition poll from ${poll.status} to ${input.status}`
    );
  }

  return prisma.poll.update({
    where: { id },
    data: {
      status: input.status,
      publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
    },
    select: pollSummarySelect,
  });
}

async function deletePoll(id: string, userId: string) {
  const poll = await findPollOrThrow(id);
  assertOwner(poll, userId);

  if (poll.status === 'ACTIVE') {
    throw new BadRequestError('Cannot delete an active poll. Close it first.');
  }

  await prisma.poll.delete({ where: { id } });
  log.info({ pollId: id, userId }, 'Poll deleted');
}

export const pollService = {
  createPoll,
  getMyPolls,
  getPollBySlug,
  getPollById,
  updatePoll,
  updateStatus,
  deletePoll,
};
