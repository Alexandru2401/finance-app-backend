import { Router } from "express";
import {
  login,
  logout,
  refresh,
  register,
  checkMe,
  updateUserInfo,
  getUserInfo,
} from "../controllers/auth.controller.js";
import { validateToken } from "../utils/jwtHelperFn.js";

const authRouter = Router();

authRouter.post("/register", register);

authRouter.post("/login", login);

// fara validateToken: se apeleaza tocmai cand access token-ul a expirat
authRouter.post("/refresh", refresh);

authRouter.patch("/user-info", validateToken, updateUserInfo);

// fara validateToken: logout-ul trebuie sa mearga si dupa ce access token-ul a expirat
authRouter.post("/logout", logout);

authRouter.get("/check-me", validateToken, checkMe);

authRouter.get("/user-info", validateToken, getUserInfo);

export default authRouter;
