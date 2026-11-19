import app from "./app.js";
import { PORT, NODE_ENV } from "./config/env.js";
import pool from "./db/db.js";
import { logger } from "./utils/logger.js";

const server = app;

pool
  .query("SELECT NOW()")
  .then(() => {
    logger.info("DB connected");
    server.listen(PORT, () => {
      logger.info(`App is running on port ${PORT}`, { env: NODE_ENV });
    });
  })
  .catch((err) => {
    logger.error(`DB connection failed: ${err.message}`, { code: err.code });
    // cod 1: Render vede ca pornirea a esuat
    process.exit(1);
  });
