import { Router } from "express";
import soccerHandlers from "./soccerHandlers";

const router = Router();

// It is possible that the scope of the project will be expanded to other sports.
// To be ready for that, I have created an additional layer.

router.use("/soccer", soccerHandlers);

export default router;
