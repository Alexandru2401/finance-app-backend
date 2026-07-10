import pg from "pg";
const { Pool } = pg;

import { DATABASE_URL } from "../config/env.js";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default pool;
