import dotenv from "dotenv";
import winston from "winston";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      PORT: string;
      POSTGRES_URL: string;
      REDIS_URL: string;
      CLEANUP_STARTED_MATCHES: "true" | "false";
      KEEP_LOGS_DAYS: string;
    }
  }
}

dotenv.config();
export const env = process.env;

const { combine, timestamp, printf } = winston.format;

export const loggerFormat = combine(
  timestamp(),
  printf(({ timestamp, message }) => `${timestamp} ${message}`)
);
