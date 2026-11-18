import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_REFRESH_TOKEN } from "../config/env.js";
import { isUserActive } from "../services/auth.services.js";

// algoritmul e fixat si la verificare: un token semnat altfel e respins
const ALGORITHM = "HS256";

const createAccesToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: "15m",
  });
};

// jwtid unic: doua token-uri emise in aceeasi secunda pentru acelasi user
// difera, deci au si hash-uri diferite in refresh_tokens (rotatie)
const createRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_TOKEN, {
    algorithm: ALGORITHM,
    expiresIn: "30d",
    jwtid: randomUUID(),
  });
};

// arunca eroare daca token-ul e invalid sau expirat
const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_TOKEN, { algorithms: [ALGORITHM] });
};

const validateToken = async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token was provided" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: [ALGORITHM] });
  } catch (err) {
    console.log(err);
    return res
      .status(403)
      .json({ success: false, message: "Invalid or expired token" });
  }

  try {
    // un cont dezactivat sau sters pierde accesul imediat, nu dupa cele
    // 15 minute ale access token-ului; /auth/refresh il respinge si el
    if (!(await isUserActive(decoded.user_id))) {
      return res
        .status(401)
        .json({ success: false, message: "Account is disabled" });
    }
  } catch (err) {
    return next(err);
  }

  req.user = decoded;
  next();
};

export {
  createAccesToken,
  createRefreshToken,
  verifyRefreshToken,
  validateToken,
};
