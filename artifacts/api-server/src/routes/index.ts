import { Router, type IRouter } from "express";
import healthRouter from "./health";
import deRouter from "./de";

const router: IRouter = Router();

router.use(healthRouter);
router.use(deRouter);

export default router;
