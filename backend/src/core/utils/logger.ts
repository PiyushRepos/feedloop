import pino, { type Logger, type LoggerOptions } from 'pino';
import env from '../config/env.js';

const isDev = env.NODE_ENV === 'development';

/**
 * Sensitive fields that will be redacted from all log output.
 * Add any field names that could carry PII or secrets.
 */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.token',
  '*.secret',
  '*.accessToken',
  '*.refreshToken',
  '*.apiKey',
];

const baseOptions: LoggerOptions = {
  level: isDev ? 'debug' : 'info',
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
};

function buildLogger(): Logger {
  if (isDev) {
    return pino({
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '[{context}] {msg}',
        },
      },
    });
  }

  return pino(baseOptions);
}

/**
 * Root logger. Use this directly or create a child logger via `createLogger`.
 */
export const logger: Logger = buildLogger();

/**
 * Creates a child logger pre-bound to a context label.
 * Prefer this over the root logger inside modules/services so every log line
 * carries the source context automatically.
 *
 * @example
 * const log = createLogger("AuthService");
 * log.info("User signed in");
 * // → [...] [AuthService] User signed in
 */
export function createLogger(context: string): Logger {
  return logger.child({ context });
}

export default logger;
