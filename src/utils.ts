import dotenv from "dotenv";
import winston from "winston";

// Made the environment variables type-safe.
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      PORT: string;

      POSTGRES_PASSWORD: string;
      REDIS_PASSWORD: string;

      CLEANUP_STARTED_MATCHES: "true" | "false";
      KEEP_LOGS_DAYS: string;
    }
  }
}

dotenv.config();
// Ensured the environment variables are always initialized properly
// regardless of the order of import statements.
export const env = process.env;

const { combine, timestamp, printf } = winston.format;

export const loggerFormat = combine(
  timestamp(),
  printf(({ timestamp, message }) => `${timestamp} ${message}`)
);
