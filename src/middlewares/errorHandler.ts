import * as Sentry from "@sentry/node";
import { NextFunction, Request, Response } from "express";
import { logger } from "../utils";

// Implemented AppError class to handle the errors in a centralized way.

export class AppError extends Error {
  statusCode: number;
  details?: any;
  critical?: boolean;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.details = details;
  }
}

const errorHandler = (
  err: any,
  _1: Request,
  res: Response,
  _2: NextFunction
) => {
  if (err instanceof SyntaxError && err.message.includes("JSON")) {
    err = new AppError(400, "Invalid JSON payload");
  }

  if (err instanceof AppError) {
    const { statusCode, message, details } = err;
    res.status(statusCode).json({ statusCode, message, details });
    return;
  }

  logger.error(`${err?.message}: ${err?.stack}`);
  Sentry.captureException(err);

  res.status(500).json({
    statusCode: 500,
    message: "Unexpected Server Error",
  });
};

export default errorHandler;
