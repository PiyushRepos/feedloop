import app from './app.js';
import { createServer } from 'http';
import env from './core/config/env.js';
import { createLogger } from './core/utils/logger.js';
import { initIO } from './core/ws/io.js';
import { registerPollHandlers } from './core/ws/pollHandler.js';

const log = createLogger('Server');

function main() {
  try {
    const PORT: number = env.PORT || 3000;
    const server = createServer(app());

    // Attach Socket.io to the same HTTP server Express is running on
    const io = initIO(server);
    io.on('connection', (socket) => {
      log.info({ socketId: socket.id }, 'Client connected');
      registerPollHandlers(io, socket);
      socket.on('disconnect', () => {
        log.info({ socketId: socket.id }, 'Client disconnected');
      });
    });

    server.listen(PORT, () => {
      log.info(`Listening on http://localhost:${PORT}`);
    });

    process.on('SIGINT', () => {
      log.info('Received SIGINT. Shutting down gracefully...');
      server.close(() => {
        log.info('Server closed. Exiting process.');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      log.info('Received SIGTERM. Shutting down gracefully...');
      server.close(() => {
        log.info('Server closed. Exiting process.');
        process.exit(0);
      });
    });
  } catch (error) {
    log.error({ err: error }, 'Error starting server');
    process.exit(1);
  }
}

main();
