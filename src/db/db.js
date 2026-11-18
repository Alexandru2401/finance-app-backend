import pg from "pg";
const { Pool, types } = pg;

// DATE (oid 1082) ramane string "YYYY-MM-DD"; altfel pg il face Date JS la
// miezul noptii pe fusul serverului si ziua se poate muta cu una in FE
types.setTypeParser(1082, (value) => value);

import { readFileSync } from "node:fs";
import { DATABASE_URL } from "../config/env.js";

// SUPABASE CERTIFICATE FOR SSL
const SUPABASE_CA = readFileSync(
  new URL("../../certs/prod-ca-2021.crt", import.meta.url),
  "utf8",
);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { ca: SUPABASE_CA },
});

export default pool;
