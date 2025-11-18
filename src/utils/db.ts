import mysql from "mysql2/promise";
import { config } from "../../config/db.config";

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  database: config.db.database,
  password: config.db.password,
  dateStrings: true,
  queueLimit: 10,
});

export default pool;