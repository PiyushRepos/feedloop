import express, { type Application } from 'express';
import cors from 'cors';
import { errorHandler } from './core/middleware/errorHandler.js';
import { globalRateLimit } from './core/middleware/rateLimit.js';
import authRouter from './modules/auth/auth.router.js';
import { sendSuccess } from './core/utils/apiResponse.js';

function createApp(): Application {
  const app = express();

  // ─── Global middleware ────────────────────────────────────────────────────
  app.use(cors());
  app.use(express.json());
  app.use(globalRateLimit);

  // ─── Routes ───────────────────────────────────────────────────────────────
  app.get('/', (_req, res) => {
    sendSuccess(res, 'Welcome to FeedLoop API!', null);
  });

  app.use('/api/auth', authRouter);

  // ─── Global error handler (must be last) ─────────────────────────────────
  app.use(errorHandler);

  return app;
}

export default createApp;
