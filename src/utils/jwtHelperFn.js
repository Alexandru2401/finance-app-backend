import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_REFRESH_TOKEN } from "../config/env";

const createAccesToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
};

const createRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_TOKEN, {
    expiresIn: "30d",
  });
};

const validateToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "No token was provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
export { createAccesToken, createRefreshToken, validateToken };
