import winston from "winston";
import { NODE_ENV } from "../config/env.js";

// Logger-ul aplicatiei (winston)
// - development: text colorat, usor de citit in terminal
// - staging / production: JSON pe o linie (timestamp, level, message + campuri)
// Niveluri: error > warn > info > http (cererile, din morgan) > debug.
const isDevelopment = NODE_ENV === "development";

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level} ${message}${extra}${stack ? `\n${stack}` : ""}`;
  }),
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL?.trim() || "http",
  format: isDevelopment ? devFormat : jsonFormat,
  transports: [
    // erorile necaptate (exceptii si promisiuni respinse) ajung tot aici
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
});

// pentru morgan: fiecare cerere devine un log de nivel http
const httpStream = {
  write: (line) => logger.http(line.trim()),
};

export { logger, httpStream };
