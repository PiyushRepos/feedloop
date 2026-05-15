import { schedule } from 'node-cron';
import prisma from '../../prisma/client.js';
import { createLogger } from '../utils/logger.js';
import { broadcastPublicUpdate, broadcastOwnerUpdate } from '../ws/pollHandler.js';
import type { Server as SocketIOServer } from 'socket.io';

const log = createLogger('ExpirePollsCron');

/**
 * Finds all ACTIVE polls whose expiresAt has passed, closes them in one query,
 * then broadcasts the status change to all WebSocket subscribers.
 *
 * Runs every 60 seconds. Up to ~60s delay between actual expiry and closure —
 * acceptable for a poll platform. Tune the cron expression if tighter precision needed.
 */
export function startExpirePollsCron(io: SocketIOServer): void {
  schedule('* * * * *', async () => {
    try {
      // Fetch slugs first — needed for WebSocket broadcasts after closing
      const expiredPolls = await prisma.poll.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lt: new Date() },
        },
        select: { id: true, slug: true },
      });

      if (expiredPolls.length === 0) return;

      // Close all in one query
      await prisma.poll.updateMany({
        where: { id: { in: expiredPolls.map((p) => p.id) } },
        data: { status: 'CLOSED' },
      });

      log.info({ count: expiredPolls.length }, 'Expired polls auto-closed');

      // Broadcast closure to each poll's WebSocket rooms — fire and forget
      for (const poll of expiredPolls) {
        broadcastPublicUpdate(io, poll.slug).catch((err) =>
          log.error({ err, slug: poll.slug }, 'Failed to broadcast expiry to public room')
        );
        broadcastOwnerUpdate(io, poll.slug).catch((err) =>
          log.error({ err, slug: poll.slug }, 'Failed to broadcast expiry to owner room')
        );
      }
    } catch (err) {
      log.error({ err }, 'Expire polls cron failed');
    }
  });

  log.info('Expire polls cron started (every 60s)');
}
