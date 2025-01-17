import dotenv from "dotenv";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

// Ensuring the environment variables are type-safe and are always
// initialized properly regardless of the order of import statements.

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      PORT: string;

      POSTGRES_PASSWORD: string;
      POSTGRES_URL: string;

      REDIS_PASSWORD: string;
      REDIS_URL: string;

      KEEP_LOGS_DAYS: string;
      SCRAPING_INTERVAL_MINUTES: string;
      REDIS_CACHE_MINUTE: string;
      BROWSER_CACHE_MINUTE: string;

      SCRAPING_MAX_TABS: string;
      CLEANUP_STARTED_MATCHES: "true" | "false";

      SENTRY_DSN: string;
    }
  }
}
dotenv.config();
export const env = process.env;

const { combine, timestamp, printf } = winston.format;

export const loggerFormat = combine(
  timestamp(),
  printf(
    ({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`
  )
);

export const logger = winston.createLogger({
  level: "error",
  format: loggerFormat,
  transports: [
    new winston.transports.Console({
      level: env.NODE_ENV === "development" ? "debug" : "info",
    }),
    new DailyRotateFile({
      filename: "logs/errors-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: env.KEEP_LOGS_DAYS,
    }),
  ],
});
