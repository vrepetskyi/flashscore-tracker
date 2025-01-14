// src/middleware/errorHandler.ts
import { NextFunction, Request, Response } from 'express';

// Custom error class for easier error handling
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;  // Operational errors are errors we expect in the application (e.g., 404, 400)
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
const errorHandler = (
  err: any, // Error object passed to the middleware
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    // Known operational error
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  } else {
    // Unexpected server error
    console.error(err);  // Log the error for debugging
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong, please try again later'
    });
  }
};

// Middleware to handle validation or other errors (optional)
const validationErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'ValidationError') {
    // For validation errors
    res.status(400).json({
      status: 'error',
      message: 'Validation error',
      details: err.errors
    });
  } else {
    next(err); // Pass error to the global error handler
  }
};

// Export the error handler
export { AppError, errorHandler, validationErrorHandler };

