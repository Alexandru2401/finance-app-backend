import { Router } from "express";
import { validateToken } from "../utils/jwtHelperFn.js";
import {
  getTarget,
  getAllTargets,
  saveTarget,
} from "../controllers/target.controller.js";

const targetRouter = Router();

targetRouter.use(validateToken); // protejeaza tot fisierul

targetRouter.get("/", getTarget);
targetRouter.get("/all", getAllTargets);
targetRouter.post("/", saveTarget);

export default targetRouter;
