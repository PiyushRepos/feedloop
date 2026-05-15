import prisma from '../../prisma/client.js';
import { createLogger } from '../../core/utils/logger.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../core/errors/AppError.js';

const log = createLogger('AnalyticsService');

// ─── Types ────────────────────────────────────────────────────────────────────

interface OptionResult {
  id: string;
  text: string;
  order: number;
  count: number;
  percentage: number;
}

interface QuestionResult {
  id: string;
  text: string;
  order: number;
  options: OptionResult[];
}

interface TimelineEntry {
  day: string; // ISO date string e.g. "2025-05-15"
  count: number;
}

interface CountEntry {
  label: string;
  count: number;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Fetches the poll with full question/option structure for result aggregation
 * Resolves access: PUBLISHED polls are public; all other statuses require ownership
 */
async function fetchPollForResults(slug: string, userId?: string) {
  const poll = await prisma.poll.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      isAnonymous: true,
      publishedAt: true,
      createdAt: true,
      creatorId: true,
      questions: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          text: true,
          order: true,
          options: {
            orderBy: { order: 'asc' },
            select: { id: true, text: true, order: true },
          },
        },
      },
    },
  });

  if (!poll) throw new NotFoundError('Poll not found');

  const isOwner = userId === poll.creatorId;

  if (poll.status === 'DRAFT' || poll.status === 'ACTIVE') {
    // Only creator can preview results before closing/publishing
    if (!isOwner) throw new NotFoundError('Poll not found');
  }

  if (poll.status === 'CLOSED' && !isOwner) {
    throw new BadRequestError('Results have not been published yet');
  }

  return { poll, isOwner };
}

/**
 * Aggregates vote counts per option across all questions of a poll
 * Returns a Map<optionId, count> for O(1) lookup when building results
 */
async function buildOptionCountMap(
  pollId: string
): Promise<Map<string, number>> {
  const rows = await prisma.responseAnswer.groupBy({
    by: ['selectedOptionId'],
    where: { response: { pollId } },
    _count: { selectedOptionId: true },
  });

  return new Map(
    rows.map((r) => [r.selectedOptionId, r._count.selectedOptionId])
  );
}

/**
 * Shapes question + option data into result objects with counts and percentages
 */
function buildQuestionResults(
  questions: Array<{
    id: string;
    text: string;
    order: number;
    options: Array<{ id: string; text: string; order: number }>;
  }>,
  optionCounts: Map<string, number>,
  totalResponses: number
): QuestionResult[] {
  return questions.map((q) => {
    const options: OptionResult[] = q.options.map((o) => {
      const count = optionCounts.get(o.id) ?? 0;
      const percentage =
        totalResponses > 0
          ? Math.round((count / totalResponses) * 1000) / 10
          : 0;
      return { id: o.id, text: o.text, order: o.order, count, percentage };
    });
    return { id: q.id, text: q.text, order: q.order, options };
  });
}

// ─── Analytics helpers ────────────────────────────────────────────────────────

/**
 * Responses grouped by calendar day (UTC)
 * Uses $queryRaw because Prisma's groupBy does not support date truncation natively
 */
async function getTimeline(pollId: string): Promise<TimelineEntry[]> {
  const rows = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
    SELECT
      DATE_TRUNC('day', submitted_at) AS day,
      COUNT(*)::bigint                AS count
    FROM responses
    WHERE poll_id = ${pollId}
    GROUP BY day
    ORDER BY day ASC
  `;

  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    count: Number(r.count),
  }));
}

/**
 * Groups responses by a nullable string column (country / region / city / device / browser / os)
 * Null / empty values are excluded
 */
async function groupByColumn(
  pollId: string,
  column: 'country' | 'region' | 'city' | 'device' | 'browser' | 'os'
): Promise<CountEntry[]> {
  const rows = await prisma.response.groupBy({
    by: [column],
    where: { pollId, [column]: { not: null } },
    _count: { [column]: true },
    orderBy: { _count: { [column]: 'desc' } },
    take: 20, // cap at top-20 to keep payload small
  });

  return rows
    .filter((r) => r[column] !== null)
    .map((r) => ({
      label: r[column] as string,
      count: (r._count as Record<string, number>)[column] ?? 0,
    }));
}

// ─── Public service functions ─────────────────────────────────────────────────

/**
 * Public results — vote counts per option
 * Accessible when poll is PUBLISHED (or by owner at CLOSED/PUBLISHED status)
 */
async function getPollResults(slug: string, userId?: string) {
  const { poll } = await fetchPollForResults(slug, userId);

  const [totalResponses, optionCounts] = await Promise.all([
    prisma.response.count({ where: { pollId: poll.id } }),
    buildOptionCountMap(poll.id),
  ]);

  const questions = buildQuestionResults(
    poll.questions,
    optionCounts,
    totalResponses
  );

  log.info({ pollId: poll.id, userId }, 'Results fetched');

  return {
    poll: {
      id: poll.id,
      slug: poll.slug,
      title: poll.title,
      description: poll.description,
      status: poll.status,
      isAnonymous: poll.isAnonymous,
      publishedAt: poll.publishedAt,
      createdAt: poll.createdAt,
    },
    totalResponses,
    questions,
  };
}

/**
 * Owner-only analytics — full breakdown including timeline, geo and device data
 */
async function getPollAnalytics(id: string, userId: string) {
  const poll = await prisma.poll.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      isAnonymous: true,
      publishedAt: true,
      createdAt: true,
      creatorId: true,
      questions: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          text: true,
          order: true,
          options: {
            orderBy: { order: 'asc' },
            select: { id: true, text: true, order: true },
          },
        },
      },
    },
  });

  if (!poll) throw new NotFoundError('Poll not found');
  if (poll.creatorId !== userId)
    throw new ForbiddenError('You do not own this poll');

  // Run all aggregations in parallel
  const [
    totalResponses,
    optionCounts,
    timeline,
    countries,
    regions,
    cities,
    deviceTypes,
    browsers,
    operatingSystems,
  ] = await Promise.all([
    prisma.response.count({ where: { pollId: id } }),
    buildOptionCountMap(id),
    getTimeline(id),
    groupByColumn(id, 'country'),
    groupByColumn(id, 'region'),
    groupByColumn(id, 'city'),
    groupByColumn(id, 'device'),
    groupByColumn(id, 'browser'),
    groupByColumn(id, 'os'),
  ]);

  const questions = buildQuestionResults(
    poll.questions,
    optionCounts,
    totalResponses
  );

  log.info({ pollId: id, userId }, 'Analytics fetched');

  return {
    poll: {
      id: poll.id,
      slug: poll.slug,
      title: poll.title,
      description: poll.description,
      status: poll.status,
      isAnonymous: poll.isAnonymous,
      publishedAt: poll.publishedAt,
      createdAt: poll.createdAt,
    },
    totalResponses,
    questions,
    timeline,
    geo: { countries, regions, cities },
    devices: { types: deviceTypes, browsers, os: operatingSystems },
  };
}

export const analyticsService = {
  getPollResults,
  getPollAnalytics,
};
