import express from "express";
import cookieParser from "cookie-parser";
import { BASE_PATH, CLIENT_URL } from "./config/env.js";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import authRouter from "./routes/auth.routes.js";
import budgetRouter from "./routes/budget.routes.js";
import transactionsRouter from "./routes/transactions.routes.js";
import targetRouter from "./routes/target.routes.js";
import errorMiddleware from "./middleware/error.middleware.js";
import categoriesRouter from "./routes/categories.routes.js";

const app = express();

// Render pune un proxy în fața aplicației; fără asta req.ip ar fi IP-ul proxy-ului
// si rate limiting-ul ar bloca toti userii deodata.
// Cand activezi proxy-ul prin Netlify (_redirects), schimba in 2.
app.set("trust proxy", 1);

const allowedOrigins = CLIENT_URL?.split(",").map((url) => url.trim()) ?? [];

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use(`${BASE_PATH}/auth`, authRouter);
app.use(`${BASE_PATH}/budget`, budgetRouter);
app.use(`${BASE_PATH}/transactions`, transactionsRouter);
app.use(`${BASE_PATH}/target`, targetRouter);
app.use(`${BASE_PATH}/categories`, categoriesRouter);

app.use(errorMiddleware);

export default app;
