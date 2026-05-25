import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import pagesRouter from "./pages";
import qaRouter from "./qa";
import generationRouter from "./generation";
import contractRouter from "./contract";
import studioRouter from "./studio";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(pagesRouter);
router.use(qaRouter);
router.use(generationRouter);
router.use(contractRouter);
router.use(studioRouter);

export default router;
