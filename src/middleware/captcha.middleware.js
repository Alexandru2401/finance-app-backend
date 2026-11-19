import { TURNSTILE_SECRET_KEY } from "../config/env.js";
import { logger } from "../utils/logger.js";

// Captcha Cloudflare Turnstile pe formularele publice (register, login).
// Status 400, nu 403: la 401/403 FE-ul incearca un refresh si repeta cererea.
const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000;
// limita din documentatia Cloudflare pentru token
const MAX_TOKEN_LENGTH = 2048;

const captchaError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const verifyCaptcha = async (req, res, next) => {
  const token = req.body?.captchaToken;

  if (
    typeof token !== "string" ||
    !token.trim() ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return next(captchaError("Captcha verification failed", 400));
  }

  let result;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: req.ip,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Turnstile responded with ${response.status}`);
    }
    result = await response.json();
  } catch (err) {
    // Cloudflare indisponibil: cererea e refuzata (fail closed), altfel
    // captcha-ul ar putea fi ocolit cand siteverify nu raspunde
    logger.warn(`Turnstile unavailable: ${err.message}`, {
      path: req.originalUrl.split("?")[0],
    });
    return next(
      captchaError("Captcha verification unavailable, try again later", 503),
    );
  }

  if (!result?.success) {
    logger.warn("Captcha verification failed", {
      path: req.originalUrl.split("?")[0],
      ip: req.ip,
      codes: result?.["error-codes"],
    });
    return next(captchaError("Captcha verification failed", 400));
  }

  next();
};

export default verifyCaptcha;
