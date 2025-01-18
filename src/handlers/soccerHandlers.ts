import { Router } from "express";
import { z } from "zod";
import cacheMiddleware from "../middlewares/cacheMiddleware";
import requestValidator from "../middlewares/requestValidator";
import {
  couponSchema,
  getCouponOddsByBookmaker,
} from "../services/soccer/soccerCouponsService";
import {
  getLeagues,
  getUpcoming,
  isLeagueValid,
} from "../services/soccer/soccerMatchesService";

const router = Router();

// I have assumed that the leagues are not known beforehand and are determined
// during the scraping phase. Therefore, a lookup is available.

router.get(
  "/matches/upcoming/leagues",
  cacheMiddleware(),
  requestValidator(),
  async (_, res, next) => {
    try {
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
      res.json(await getCouponOddsByBookmaker(req.body.coupon));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
