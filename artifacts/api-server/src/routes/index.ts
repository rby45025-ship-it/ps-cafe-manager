import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devicesRouter from "./devices";
import sessionsRouter from "./sessions";
import revenueRouter from "./revenue";
import settingsRouter from "./settings";
import githubExportRouter from "./github-export";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devicesRouter);
router.use(sessionsRouter);
router.use(revenueRouter);
router.use(settingsRouter);
router.use(githubExportRouter);

export default router;
