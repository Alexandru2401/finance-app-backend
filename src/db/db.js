import pg from "pg";
const { Pool, types } = pg;

// DATE (oid 1082) ramane string "YYYY-MM-DD"; altfel pg il face Date JS la
// miezul noptii pe fusul serverului si ziua se poate muta cu una in FE
types.setTypeParser(1082, (value) => value);

import { DATABASE_URL } from "../config/env.js";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default pool;
