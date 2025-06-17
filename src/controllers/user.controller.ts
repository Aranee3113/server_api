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
                  FROM user`;

      const [rows]: any = await pool.query(sql);
      if (!rows || rows.length === 0) {
        return {
          status: 204,
          success: true,
          message: "User data empty",
          data: [],
        };
      }

      return {
        status: 200,
        success: true,
        message: "Success",
        data: rows,
      };
    } catch (err) {
      console.log(err);
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },

  getUserById: async (ctx: any) => {
    const userId = ctx.params.id;
    try {
      const sql = `SELECT
                      user.user_name, 
                      user.user_id, 
                      user.user_username, 
                      user.is_admin
                  FROM user
                  WHERE user_id = ?`;

      const [rows]: any = await pool.query(sql, [userId]);
      if (!rows || rows.length === 0) {
        return {
          status: 204,
          success: true,
          message: "User data empty",
          data: [],
        };
      }

      return {
        status: 200,
        success: true,
        message: "Success",
        data: rows,
      };
    } catch (err) {
      console.log(err);
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },

  deleteUserById: async (ctx: any) => {
    const userId = ctx.params.id;
    try {
      const sql = `DELETE FROM user WHERE user_id = ?`;
      const [result]: any = await pool.query(sql, [userId]);

      if (result.affectedRows === 0) {
        return {
          status: 404,
          success: false,
          message: "User not found",
        };
      }

      return {
        status: 200,
        success: true,
        message: "User deleted successfully",
      };
    } catch (err) {
      console.log(err);
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },
  
};
