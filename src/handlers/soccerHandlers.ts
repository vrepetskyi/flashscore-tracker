import { Router } from "express";
import { z } from "zod";
import cacheMiddleware from "../middlewares/cacheMiddleware.js";
import requestValidator from "../middlewares/requestValidator.js";
import {
  couponSchema,
  getCouponOddsByBookmaker,
} from "../services/soccer/soccerCouponsService.js";
import {
  getLeagues,
  getUpcoming,
  isLeagueValid,
} from "../services/soccer/soccerMatchesService.js";
import { env } from "../utils.js";

const router = Router();

// I have assumed that the leagues are not known beforehand and are determined
// during the scraping phase. Therefore, a lookup is available.

router.get(
  "/matches/upcoming/leagues",
  cacheMiddleware(),
  requestValidator(),
  async (_, res, next) => {
    try {
      res.set(
        "Cache-Control",
        `public, max-age=${Number(env.BROWSER_CACHE_MINUTES) * 60}`
      );
      res.json(await getLeagues());
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/matches/upcoming",
  cacheMiddleware(),
  requestValidator({
    querySchema: z.object({
      league: z
        .string()
        .refine(isLeagueValid, {
          message:
            "None of the upcoming matches for today belong to the specified league. Lookup available leagues via /matches/upcoming/leagues endpoint",
        })
        .optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      res.set(
        "Cache-Control",
        `public, max-age=${Number(env.BROWSER_CACHE_MINUTES) * 60}`
      );
      res.json(await getUpcoming(req.query.league));
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/coupons/calculate",
  cacheMiddleware(),
  requestValidator({
    bodySchema: z.object({
      coupon: couponSchema,
    }),
  }),
  async (req, res, next) => {
    try {
      res.set(
        "Cache-Control",
        `public, max-age=${Number(env.BROWSER_CACHE_MINUTES) * 60}`
      );
      res.json(await getCouponOddsByBookmaker(req.body.coupon));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
