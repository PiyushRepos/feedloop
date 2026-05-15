import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import env from '../config/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('SocketIO');

let io: SocketIOServer | null = null;

/**
 * Attaches a Socket.io server to the HTTP server
 * Must be called once during application startup, before any emits
 */
export function initIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Disable HTTP long-polling fallback — WebSocket only
    transports: ['websocket'],
  });

  log.info('Socket.io server initialized');
  return io;
}

/**
 * Returns the initialized Socket.io instance
 * Throws if called before initIO()
 */
export function getIO(): SocketIOServer {
  if (!io)
    throw new Error('Socket.io not initialized — call initIO(server) first');
  return io;
}
