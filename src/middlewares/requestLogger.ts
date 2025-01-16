import { NextFunction, Request, Response } from "express";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { env } from "../utils.js";

const dailyRotateTransport = new DailyRotateFile({
  filename: "logs/requests-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxFiles: env.KEEP_LOGS_DAYS,
});

const { combine, timestamp, printf } = winston.format;

const logger = winston.createLogger({
  format: combine(
    timestamp(),
    printf(({ timestamp, message }) => `${timestamp} ${message}`)
  ),
  transports: [dailyRotateTransport],
});

if (env.NODE_ENV === "development") {
  logger.add(new winston.transports.Console());
}

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const { method, url, headers, body, query } = req;
  const { remoteAddress } = req.socket;

  const logMessage = {
    remoteAddress,
    method,
    url,
    query,
    body,
    headers,
  };

  logger.info(`Request: ${JSON.stringify(logMessage, null, 2)}`);

  next();
};

export default requestLogger;
