import { Router } from "express";
import { z } from "zod";
import requestValidator from "../middlewares/requestValidator";

const router = Router();

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
