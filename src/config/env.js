import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

// REQUIRED_VARS
const REQUIRED_VARS = [
  "PORT",
  "BASE_PATH",
  "DATABASE_URL",
  "SALT_ROUNDS",
  "JWT_SECRET",
  "JWT_REFRESH_TOKEN",
  "CLIENT_URL",
];

const missing = REQUIRED_VARS.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (!/^\d+$/.test(process.env.SALT_ROUNDS.trim())) {
  console.error("SALT_ROUNDS must be an integer");
  process.exit(1);
}

export const {
  PORT,
  NODE_ENV,
  BASE_PATH,
  SALT_ROUNDS,
  JWT_SECRET,
  JWT_REFRESH_TOKEN,
  DATABASE_URL,
  CLIENT_URL,
} = process.env;
