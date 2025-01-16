import { NextFunction, Request, Response } from "express";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { env, loggerFormat } from "../utils.js";

export class AppError extends Error {
  statusCode: number;
  details?: any;
  critical?: boolean;

  constructor(
    statusCode: number,
    message: string,
    details?: any,
    critical?: boolean
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.details = details;
    this.critical = critical;

    if (critical && Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

const logger = winston.createLogger({
  format: loggerFormat,
  transports: [
    new DailyRotateFile({
      filename: "logs/errors-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: env.KEEP_LOGS_DAYS,
    }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

const errorHandler = (
  err: any,
  _1: Request,
  res: Response,
  _2: NextFunction
) => {
  if (err instanceof AppError) {
    const { statusCode, message, details, critical } = err;

    res.status(statusCode).json({ statusCode, message, details });

    if (!critical) {
      return;
    }
  }

  logger.error(`${err?.message}: ${err?.stack}`);

  if (err instanceof AppError) {
    return;
  }

  res.status(500).json({
    statusCode: 500,
    message: "Unexpected Server Error",
  });
};

export default errorHandler;
