import { RequestHandler } from "express";
import { z, ZodError, ZodSchema } from "zod";
import { AppError } from "./errorHandler";

// Implemented a custom validation middleware with Zod.
// It generates exhaustive error messages and provides type declarations in the endpoint handlers.

const strictlyEmptySchema = z.object({}).strict();

const requestValidator =
  <B, Q>({
    bodySchema,
    querySchema,
  }: {
    bodySchema?: ZodSchema<B>;
    querySchema?: ZodSchema<Q>;
  } = {}): RequestHandler<{}, any, B, Q> =>
  async (req, _, next) => {
    try {
      await (bodySchema ?? strictlyEmptySchema).parseAsync(req.body);
      await (querySchema ?? strictlyEmptySchema).parseAsync(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new AppError(400, "Validation Error", err.errors));
      }
      next(err);
    }
  };

export default requestValidator;
