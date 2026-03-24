import app from "./app.js";
import { PORT } from "./config/env.js";
import pool from "./db/db.js";

const server = app;

pool
  .query("SELECT NOW()")
  .then(() => {
    console.log("DB connected");
    server.listen(PORT, () => {
      console.log(`App is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);

    process.exit();
  });
