import { Router } from "express";
import soccerRoutes from "./soccerRoutes.js";

const router = Router();

// It is possible that the scope of the project will be expanded to other sports.

router.use("/soccer", soccerRoutes);

export default router;
