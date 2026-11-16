import { Router } from "express";
import {
  login,
  logout,
  refresh,
  register,
  checkMe,
  updateUserInfo,
  getUserInfo,
  updateUserPassword,
  resetData,
  deleteAccount,
} from "../controllers/auth.controller.js";
import { validateToken } from "../utils/jwtHelperFn.js";
import rateLimit from "../middleware/rateLimit.middleware.js";

const authRouter = Router();

authRouter.post("/register", rateLimit(5, 15), register);

authRouter.post("/login", rateLimit(5, 15), login);

authRouter.post("/refresh", rateLimit(20, 15), refresh);

authRouter.patch(
  "/user-info",
  validateToken,
  rateLimit(30, 15),
  updateUserInfo,
);

authRouter.post("/logout", rateLimit(5, 15), logout);

authRouter.get("/check-me", validateToken, rateLimit(100, 15), checkMe);

authRouter.get("/user-info", validateToken, rateLimit(30, 15), getUserInfo);

authRouter.patch(
  "/update-password",
  validateToken,
  rateLimit(5, 15),
  updateUserPassword,
);

// cer parola; limita mica, ca parola sa nu poata fi ghicita aici
authRouter.delete("/data", validateToken, rateLimit(5, 15), resetData);

authRouter.delete("/account", validateToken, rateLimit(5, 15), deleteAccount);

export default authRouter;
