import express from "express";
import cookieParser from "cookie-parser";
import { BASE_PATH, CLIENT_URL } from "./config/env.js";
import cors from "cors";
import morgan from "morgan";

import authRouter from "./routes/auth.routes.js";
import budgetRouter from "./routes/budget.routes.js";

import errorMiddleware from "./middleware/error.middleware.js";

const app = express();

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use(`${BASE_PATH}/auth`, authRouter);
app.use(`${BASE_PATH}/budget`, budgetRouter);

app.use(errorMiddleware);

export default app;
