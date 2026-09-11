import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const {
  PORT,
  NODE_ENV,
  BASE_PATH,
  SALT_ROUNDS,
  JWT_SECRET,
  JWT_REFRESH_TOKEN,
  DATABASE_URL,
} = process.env;
