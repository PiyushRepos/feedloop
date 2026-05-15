import type { Server as SocketIOServer, Socket } from 'socket.io';
import { createLogger } from '../utils/logger.js';
import { analyticsService } from '../../modules/analytics/analytics.service.js';
import prisma from '../../prisma/client.js';
import { verifyJwt } from '../utils/token.js';
import env from '../config/env.js';

const log = createLogger('PollHandler');

// ─── Room keys ────────────────────────────────────────────────────────────────

// Public room — anyone watching the poll page
const publicRoom = (slug: string) => `poll:${slug}`;

// Owner room — creator only, gated by JWT on subscribe
const ownerRoom = (slug: string) => `poll:${slug}:owner`;

// ─── Token verification ───────────────────────────────────────────────────────

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    const payload = await verifyJwt<JwtPayload>(token, env.JWT_ACCESS_SECRET);
    return payload.sub;
  } catch {
    return null;
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Registers poll-specific Socket.io event handlers for a connected socket.
 *
 * Client → Server events:
 *   poll:subscribe        { slug }               — join public room (live stats / published results)
 *   poll:subscribe:owner  { slug, token }         — join owner room (full analytics, JWT required)
 *   poll:unsubscribe      { slug }               — leave public room
 *   poll:unsubscribe:owner { slug }              — leave owner room
 *
 * Server → Client events:
 *   poll:stats_update     { totalResponses, remaining }          — ACTIVE poll (public)
 *   poll:results_update   { totalResponses, questions }          — PUBLISHED poll (public)
 *   poll:analytics_update { totalResponses, questions, geo, ... }— owner room always
 */
export function registerPollHandlers(io: SocketIOServer, socket: Socket): void {
  // ── Public subscribe ───────────────────────────────────────────────────────
  socket.on('poll:subscribe', async ({ slug }: { slug: string }) => {
    if (!slug || typeof slug !== 'string') return;

    await socket.join(publicRoom(slug));
    log.info({ socketId: socket.id, slug }, 'Joined public poll room');

    // Hydrate immediately with whatever is currently visible
    await emitPublicUpdate(socket, slug);
  });

  socket.on('poll:unsubscribe', async ({ slug }: { slug: string }) => {
    if (!slug || typeof slug !== 'string') return;
    await socket.leave(publicRoom(slug));
    log.info({ socketId: socket.id, slug }, 'Left public poll room');
  });

  // ── Owner subscribe (JWT gated) ────────────────────────────────────────────
  socket.on(
    'poll:subscribe:owner',
    async ({ slug, token }: { slug: string; token: string }) => {
      if (!slug || typeof slug !== 'string') return;
      if (!token || typeof token !== 'string') {
        socket.emit('poll:error', { message: 'Authentication token required' });
        return;
      }

      const userId = await getUserIdFromToken(token);
      if (!userId) {
        socket.emit('poll:error', { message: 'Invalid or expired token' });
        return;
      }

      // Verify the user actually owns this poll
      const poll = await prisma.poll.findUnique({
        where: { slug },
        select: { id: true, creatorId: true },
      });

      if (!poll || poll.creatorId !== userId) {
        socket.emit('poll:error', { message: 'Forbidden' });
        return;
      }

      await socket.join(ownerRoom(slug));
      log.info({ socketId: socket.id, slug, userId }, 'Joined owner poll room');

      // Hydrate with full analytics immediately
      await emitOwnerUpdate(socket, poll.id, userId);
    }
  );

  socket.on('poll:unsubscribe:owner', async ({ slug }: { slug: string }) => {
    if (!slug || typeof slug !== 'string') return;
    await socket.leave(ownerRoom(slug));
    log.info({ socketId: socket.id, slug }, 'Left owner poll room');
  });
}

// ─── Emit helpers (single socket — for hydration on subscribe) ────────────────

async function emitPublicUpdate(socket: Socket, slug: string): Promise<void> {
  try {
    const poll = await prisma.poll.findUnique({
      where: { slug },
      select: { id: true, status: true, maxResponses: true },
    });
    if (!poll) return;

    if (poll.status === 'PUBLISHED') {
      // Full results visible
      const data = await analyticsService.getPollResults(slug);
      socket.emit('poll:results_update', data);
    } else if (poll.status === 'ACTIVE') {
      // Only counts — no option breakdowns
      const totalResponses = await prisma.response.count({
        where: { pollId: poll.id },
      });
      const remaining = poll.maxResponses
        ? poll.maxResponses - totalResponses
        : null;
      socket.emit('poll:stats_update', { totalResponses, remaining });
    }
    // DRAFT / CLOSED → emit nothing to public
  } catch (err) {
    log.error({ err, slug }, 'Failed to emit public update');
  }
}

async function emitOwnerUpdate(
  socket: Socket,
  pollId: string,
  userId: string
): Promise<void> {
  try {
    const data = await analyticsService.getPollAnalytics(pollId, userId);
    socket.emit('poll:analytics_update', data);
  } catch (err) {
    log.error({ err, pollId }, 'Failed to emit owner analytics update');
  }
}

// ─── Broadcast helpers (all sockets in room — called after new response) ──────

/**
 * Broadcasts to the public room after a new response is submitted
 * ACTIVE  → stats only (counts, remaining)
 * PUBLISHED → full results with option breakdowns
 * Other statuses → no broadcast
 */
export async function broadcastPublicUpdate(
  io: SocketIOServer,
  slug: string
): Promise<void> {
  const room = publicRoom(slug);
  const sockets = await io.in(room).fetchSockets();
  if (sockets.length === 0) return;

  try {
    const poll = await prisma.poll.findUnique({
      where: { slug },
      select: { id: true, status: true, maxResponses: true },
    });
    if (!poll) return;

    if (poll.status === 'PUBLISHED') {
      const data = await analyticsService.getPollResults(slug);
      io.to(room).emit('poll:results_update', data);
      log.info(
        { slug, subscribers: sockets.length },
        'Broadcast results update'
      );
    } else if (poll.status === 'ACTIVE') {
      const totalResponses = await prisma.response.count({
        where: { pollId: poll.id },
      });
      const remaining = poll.maxResponses
        ? poll.maxResponses - totalResponses
        : null;
      io.to(room).emit('poll:stats_update', { totalResponses, remaining });
      log.info({ slug, subscribers: sockets.length }, 'Broadcast stats update');
    }
  } catch (err) {
    log.error({ err, slug }, 'Failed to broadcast public update');
  }
}

/**
 * Broadcasts full analytics to the owner room after a new response is submitted.
 */
export async function broadcastOwnerUpdate(
  io: SocketIOServer,
  slug: string
): Promise<void> {
  const room = ownerRoom(slug);
  const sockets = await io.in(room).fetchSockets();
  if (sockets.length === 0) return;

  try {
    const poll = await prisma.poll.findUnique({
      where: { slug },
      select: { id: true, creatorId: true },
    });
    if (!poll) return;

    const data = await analyticsService.getPollAnalytics(
      poll.id,
      poll.creatorId
    );
    io.to(room).emit('poll:analytics_update', data);
    log.info(
      { slug, subscribers: sockets.length },
      'Broadcast owner analytics update'
    );
  } catch (err) {
    log.error({ err, slug }, 'Failed to broadcast owner update');
  }
}
