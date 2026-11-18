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
import recurringRouter from "./routes/recurring.routes.js";
import notificationsRouter from "./routes/notifications.routes.js";

const app = express();

// Lantul in productie: user -> Netlify (proxy /api/*) -> Render -> app.
// 2 = req.ip e IP-ul userului (al doilea de la dreapta din X-Forwarded-For);
// cu 1 ar fi IP-ul serverului Netlify si rate limiting-ul per IP ar fi comun
// pentru toti userii care trec prin el (security.md 1.1).
// Daca se scoate proxy-ul Netlify, se trece inapoi pe 1.
app.set("trust proxy", 2);

const allowedOrigins = CLIENT_URL?.split(",").map((url) => url.trim()) ?? [];

app.use(helmet());
// RateLimit exposed so the frontend can show how long to wait after a 429
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ["RateLimit"],
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use(`${BASE_PATH}/auth`, authRouter);
app.use(`${BASE_PATH}/budget`, budgetRouter);
app.use(`${BASE_PATH}/transactions`, transactionsRouter);
app.use(`${BASE_PATH}/target`, targetRouter);
app.use(`${BASE_PATH}/categories`, categoriesRouter);
app.use(`${BASE_PATH}/recurring`, recurringRouter);
app.use(`${BASE_PATH}/notifications`, notificationsRouter);

app.use(errorMiddleware);

export default app;
