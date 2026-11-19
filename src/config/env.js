import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

// REQUIRED_VARS
const REQUIRED_VARS = [
  "NODE_ENV",
  "PORT",
  "BASE_PATH",
  "DATABASE_URL",
  "SALT_ROUNDS",
  "JWT_SECRET",
  "JWT_REFRESH_TOKEN",
  "CLIENT_URL",
  "TURNSTILE_SECRET_KEY",
];

const missing = REQUIRED_VARS.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

// decide si cookie-urile secure (auth.controller.js): doar development le trimite
// fara secure, deci o valoare scrisa gresit nu trebuie sa treaca neobservata
const NODE_ENVS = ["development", "staging", "production"];
if (!NODE_ENVS.includes(process.env.NODE_ENV.trim())) {
  console.error(`NODE_ENV must be one of: ${NODE_ENVS.join(", ")}`);
  process.exit(1);
}

if (!/^\d+$/.test(process.env.SALT_ROUNDS.trim())) {
  console.error("SALT_ROUNDS must be an integer");
  process.exit(1);
}

export const NODE_ENV = process.env.NODE_ENV.trim();

export const {
  PORT,
  BASE_PATH,
  SALT_ROUNDS,
  JWT_SECRET,
  JWT_REFRESH_TOKEN,
  DATABASE_URL,
  CLIENT_URL,
  TURNSTILE_SECRET_KEY,
} = process.env;
