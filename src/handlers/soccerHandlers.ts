import { Router } from "express";
import { z } from "zod";
import requestValidator from "../middlewares/requestValidator.js";
import {
  getLeagues,
  getUpcoming,
  isLeagueValid,
} from "../services/soccer/soccerMatchesService.js";

const router = Router();

// I have assumed that the leagues are not known beforehand and are determined
// during the scraping phase. Therefore, a lookup is available.

router.get("/matches/leagues", requestValidator(), async (_, res, next) => {
  try {
    res.json(await getLeagues());
  } catch (err) {
    next(err);
  }
});

router.get(
  "/matches/upcoming",
  requestValidator({
    querySchema: z.object({
      league: z
        .string()
        .refine(isLeagueValid, {
          message:
            "The league is not on today's list. Lookup /matches/leagues endpoint",
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

router.post("/odds", requestValidator(), () => {});

export default router;
