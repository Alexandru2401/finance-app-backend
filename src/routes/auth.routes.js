import { Router } from "express";
import {
  login,
  logout,
  register,
  checkMe,
} from "../controllers/auth.controller.js";
import { validateToken } from "../utils/jwtHelperFn.js";

const authRouter = Router();

authRouter.post("/register", register);

authRouter.post("/login", login);

authRouter.post("/logout", validateToken, logout);

authRouter.get("/check-me", validateToken, checkMe);

export default authRouter;
