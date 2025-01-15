import { Router } from "express";
import soccerRoutes from "./soccerRoutes";

const router = Router();

router.use("/soccer", soccerRoutes);

export default router;
