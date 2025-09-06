import { pool } from "../utils/db";
import bcrypt from "bcrypt";

export const auth_controller = {
  // เพิ่มผู้ใช้ใหม่
  registeration: async (ctx: any) => {
    try {
      console.log("Body received:", ctx.body);

      const { user_name, user_username, user_password } = ctx.body;

      if (!user_name || !user_username || !user_password) {
        return {
          status: 400,
          success: false,
          message: "Missing required fields",
        };
      }

      const hashedPassword = await bcrypt.hash(user_password, 10);

      const sql = `
          INSERT INTO user (user_name, user_username, user_password, is_admin)
          VALUES (?, ?, ?, 0)
        `;

      const [result]: any = await pool.query(sql, [
        user_name,
        user_username,
        hashedPassword,
      ]);

      if (!result) {
        console.log(result);
      }

      return {
        status: 201,
        success: true,
        message: "User added successfully",
        data: {
          user_id: result.insertId,
          user_name,
          user_username,
        },
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

  login: async ({ set, body, jwt, cookie: { auth } }: any) => {
    try {
      const data = (await body.json?.()) ?? body;
      const { user_username, user_password } = data;

      if (!user_username || !user_password) {
        set.status = 400;
        return {
          status: 400,
          success: false,
          message: "Missing username or password",
        };
      }

      const sql = `
        SELECT user_id, user_username, user_password, is_admin
        FROM user
        WHERE user_username = ?
        LIMIT 1
      `;
      const [rows]: any = await pool.query(sql, [user_username]);

      if (!rows || rows.length === 0) {
        set.status = 401;
        return {
          status: 401,
          success: false,
          message: "Invalid username or password",
        };
      }

      const user = rows[0];

      const isValid = await bcrypt.compare(user_password, user.user_password);

      if (!isValid) {
        set.status = 401;
        return {
          status: 401,
          success: false,
          message: "Invalid username or password",
        };
      }

      const token = await jwt.sign({
        userId: user.user_id,
        username: user.user_username,
        isAdmin: user.is_admin,
      });

      auth.value = { authToken: token };

      return {
        status: 200,
        success: true,
        message: "Login successful",
        token,
        data: {
          user_id: user.user_id,
          user_username: user.user_username,
          is_admin: user.is_admin,
        },
      };
    } catch (err) {
      console.error("Login error:", err);
      set.status = 500;
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },
};
