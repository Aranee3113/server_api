import { status } from "elysia";
import pool from "../utils/db";
import bcrypt from "bcrypt";

export const user_controller = {
  // ดึงผู้ใช้ทั้งหมด
  getUser: async (ctx: any) => {
    try {
      const sql = `
        SELECT user_name, user_id, user_username, is_admin
        FROM user
      `;
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

  // ดึงผู้ใช้ตาม ID
  getUserById: async (ctx: any) => {
    const userId = ctx.params.id;
    try {
      const sql = `
        SELECT user_name, user_id, user_username, is_admin
        FROM user
        WHERE user_id = ?
      `;
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
        data: rows[0],
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

  // แก้ไขข้อมูลผู้ใช้ตาม ID
  updateUserById: async (ctx: any) => {
    const userId = ctx.params.id;
    const { user_name, user_username, user_password } = ctx.body;
    const is_admin = 0;

    try {
      let hashedPassword ;
      if (user_password) {
        hashedPassword = await bcrypt.hash(user_password, 10);
      }

      const sql = `
        UPDATE user
        SET user_name = ?, user_username = ?, ${
          hashedPassword ? "user_password = ?," : ""
        } is_admin = ?
        WHERE user_id = ?
      `;

      const values = hashedPassword
        ? [user_name, user_username, hashedPassword, is_admin, userId]
        : [user_name, user_username, is_admin, userId];

      const [result]: any = await pool.query(sql, values);

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
        message: "User updated successfully",
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

  // ลบผู้ใช้
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
