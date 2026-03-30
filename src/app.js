import express from "express";
import cookieParser from "cookie-parser";
import { BASE_PATH } from "./config/env.js";

import authRouter from "./routes/auth.routes.js";

import errorMiddleware from "./middleware/error.middleware.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(`${BASE_PATH}/auth`, authRouter);

app.use(errorMiddleware);

export default app;
