import { Router } from "express";
import { login, logout, register } from "../controllers/auth.contoller.js";
import { validateToken } from "../utils/jwtHelperFn.js";

const authRouter = Router();

authRouter.post("/register", register);

authRouter.post("/login", login);

authRouter.post("/logout", validateToken, logout);

export default authRouter;
