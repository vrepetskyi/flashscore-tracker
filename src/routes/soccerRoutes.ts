import { Router } from "express";
import { z } from "zod";
import requestValidator from "../middlewares/requestValidator.js";

const router = Router();

// I have assumed that the leagues are not known beforehand and are determined during the scraping phase.
// Therefore, a lookup is available and no strict validation is imposed on respective parameter in matches endpoint.

router.get("/leagues", () => {});

router.post("/matches", () => {});

router.get(
  "/odds",
  requestValidator({
    querySchema: z.object({ test: z.number() }).strict(),
  }),
  (req, res) => {
    res.status(200).json({ test: req.query.test });
  }
);

export default router;
