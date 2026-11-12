import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import rateLimit from "../middleware/rateLimit.middleware.js";
import {
  getTarget,
  getAllTargets,
  saveTarget,
  exportTargetHistory,
} from "../controllers/target.controller.js";

const targetRouter = Router();

targetRouter.use(validateToken, rateLimit(100, 15));

targetRouter.get("/", getTarget);
targetRouter.get("/all", getAllTargets);
targetRouter.get("/export", exportTargetHistory);
targetRouter.post("/", saveTarget);

export default targetRouter;
