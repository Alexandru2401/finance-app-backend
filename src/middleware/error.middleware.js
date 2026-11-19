import { logger } from "../utils/logger.js";

const errorMiddleware = (err, req, res, next) => {
  try {
    // la 500 nu trimitem mesajul intern (ex. erori Postgres) catre client
    const status = err.status || err.statusCode || 500;

    // doar ce ajuta la depanare, fara obiectul intreg: erorile Postgres au in
    // `detail` valorile din query (ex. emailul la duplicate key) (security.md 1.5)
    // 5xx = eroare (cu stack), 4xx aruncat de controller = warn
    const entry = {
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status,
      code: err.code,
      user: req.user?.user_id,
    };
    if (status >= 500) {
      logger.error(err.message, { ...entry, stack: err.stack });
    } else {
      logger.warn(err.message, entry);
    }
    const message =
      status < 500 ? err.message || "Bad request" : "Server error";

    // acelasi format ca in controllere: { success: false, message }
    res.status(status).json({ success: false, message });
  } catch (error) {
    next(error);
  }
};

export default errorMiddleware;
