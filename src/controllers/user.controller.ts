import { status } from "elysia";
import pool from "../utils/db";

export const user_controller = {
  getUser: async (ctx: any) => {
    try {
      const sql = `SELECT
                        user.user_name, 
                        user.user_id, 
                        user.user_username, 
                        user.is_admin
                    FROM
                    user`;

      const [rows]: any = await pool.query(sql);
      if (!rows || rows.length === 0) {
        return {
          status: 204,
          success: true,
          message: "user data emtry",
          data: [],
        };
      }

      return {
        status: 200,
        success: true,
        message: "success",
        data: rows,
      };
    } catch (err) {
      console.log(err);
    }
  },
  getUserById: async (ctx: any) => {
    const params = ctx.params.id;
    try {
      const sql = `SELECT
                        user.user_name, 
                        user.user_id, 
                        user.user_username, 
                        user.is_admin
                    FROM
                    user
                    WHERE user_id = ?`;

      const [rows]: any = await pool.query(sql, params);
      if (!rows || rows.length === 0) {
        return {
          status: 204,
          success: true,
          message: "user data emtry",
          data: [],
        };
      }

      return {
        status: 200,
        success: true,
        message: "user data emtry",
        rows,
      };
    } catch (err) {
      console.log(err);
    }
  },
  
};
