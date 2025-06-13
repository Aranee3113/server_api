import { status } from "elysia";
import pool from "../utils/db";

export const auth_controller = {
  register: async (ctx: any) => {
    const { user_name, user_username, user_password } = ctx.body;
    console.log(ctx);

    try {
      const sql = `INSERT INTO user (user_name, user_username, user_password)
                 VALUES (?, ?, ?)`;
      const rows = await pool.query(sql, [
        user_name,
        user_username,
        user_password,
      ]);
      if (!rows) return null;
      return {
        status: 200,
        success: true,
        message: "success",
        data: rows,
      };
    } catch (err) {
      console.error("Register Error:", err);
      return {
        status: 500,
        success: false,
        message: "Internal Server Error",
      };
    }
  },
};
