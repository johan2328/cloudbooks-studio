import { Router, type IRouter } from "express";
import healthRouter      from "./health";
import authRouter        from "./auth";
import pagesRouter       from "./pages";
import qaRouter          from "./qa";
import generationRouter  from "./generation";
import contractRouter    from "./contract";
import catalogRouter     from "./catalog";

/* ── Studio routes (separadas por responsabilidad) ── */
import studioGenerateRouter  from "./studio-generate";
import studioApprovalRouter  from "./studio-approval";
import studioStatusRouter    from "./studio-status";
import studioQaRouter        from "./studio-qa";
import studioActivityRouter  from "./studio-activity";
import studioComposerRouter  from "./studio-composer";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(pagesRouter);
router.use(qaRouter);
router.use(generationRouter);
router.use(contractRouter);
router.use(catalogRouter);

router.use(studioGenerateRouter);
router.use(studioApprovalRouter);
router.use(studioStatusRouter);
router.use(studioQaRouter);
router.use(studioActivityRouter);
router.use(studioComposerRouter);

export default router;
