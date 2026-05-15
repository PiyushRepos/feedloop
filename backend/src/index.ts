import app from './app.js';
import { createServer } from 'http';
import env from './core/config/env.js';
import { createLogger } from './core/utils/logger.js';

const log = createLogger('Server');

function main() {
  try {
    const PORT: number = env.PORT || 3000;
    const server = createServer(app());

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
