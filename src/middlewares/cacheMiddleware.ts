import * as Sentry from "@sentry/node";
import { RequestHandler, Response } from "express";
import { Redis } from "ioredis";
import { env, logger } from "../utils.js";

const redis = new Redis(env.REDIS_URL);

const cacheMiddleware = (): RequestHandler => async (req, res, next) => {
  res.set(
    "Cache-Control",
    `public, max-age=${Number(env.BROWSER_CACHE_MINUTES) * 60}`
  );

  const key = req.originalUrl;

  try {
    const cachedData = await redis.get(key);
    if (cachedData) {
      logger.debug(`Redis hit for ${key}`);
      res.json(JSON.parse(cachedData));
      return;
    }
  } catch (err) {
    logger.error(`Redis get error for ${key}:`, err);
    Sentry.captureException(err);
  }

  const originalSend = res.send;

  res.send = (body: any): Response => {
    try {
      redis.set(
        key,
        JSON.stringify(body),
        "EX",
        Number(env.REDIS_CACHE_MINUTES) * 60
      );
    } catch (err) {
      logger.error(`Redis set error for ${key}:`, err);
      Sentry.captureException(err);
    }

    return originalSend.call(res, body);
  };

  next();
};

export default cacheMiddleware;
