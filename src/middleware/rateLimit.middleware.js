import {
  rateLimit as expressRateLimit,
  ipKeyGenerator,
} from "express-rate-limit";
import { logger } from "../utils/logger.js";

// rateLimit(5, 15) => maxim 5 cereri la 15 minute
// per user daca e logat (dupa validateToken), altfel per IP
const rateLimit = (max, minutes, message) =>
  expressRateLimit({
    windowMs: minutes * 60 * 1000,
    limit: max,
    keyGenerator: (req) =>
      req.user?.user_id ? `user:${req.user.user_id}` : ipKeyGenerator(req.ip),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // la fiecare cerere respinsa cu 429 (fara a schimba raspunsul standard)
    handler: (req, res, next, options) => {
      logger.warn("Rate limit reached", {
        path: req.originalUrl.split("?")[0],
        user: req.user?.user_id,
        ip: req.ip,
      });
      res.status(options.statusCode).json(options.message);
    },
    message: {
      success: false,
      message: message || `Too many requests, try again in ${minutes} minutes`,
    },
  });

export default rateLimit;
