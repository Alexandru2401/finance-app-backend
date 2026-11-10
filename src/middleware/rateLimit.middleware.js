import {
  rateLimit as expressRateLimit,
  ipKeyGenerator,
} from "express-rate-limit";

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
    message: {
      success: false,
      message: message || `Too many requests, try again in ${minutes} minutes`,
    },
  });

export default rateLimit;
