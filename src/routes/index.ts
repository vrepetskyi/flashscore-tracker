import { Router } from "express";
import soccerRoutes from "./soccerRoutes.js";

const router = Router();

router.use("/soccer", soccerRoutes);

export default router;
