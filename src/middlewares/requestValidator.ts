import { RequestHandler } from "express";
import { z, ZodError, ZodSchema } from "zod";
import { AppError } from "./errorHandler.js";

// Implemented a custom validation middleware with Zod.
// It generates exhaustive error messages and provides type declarations in the endpoint handlers.

const requestValidator =
  <B, Q>({
    bodySchema = z.object({}).strict() as unknown as ZodSchema<B>,
    querySchema = z.object({}).strict() as unknown as ZodSchema<Q>,
  }: {
    bodySchema?: ZodSchema<B>;
    querySchema?: ZodSchema<Q>;
  }): RequestHandler<{}, any, B, Q> =>
  (req, _, next) => {
    try {
      bodySchema && bodySchema.parse(req.body);
      querySchema && querySchema.parse(req.query);
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new AppError(400, "Validation Error", err.errors));
      }
    }
    next();
  };

export default requestValidator;
