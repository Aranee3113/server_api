import { pool } from "../utils/db";
import bcrypt from "bcrypt";

export const auth_controller = {
  // สมัครสมาชิก
  registeration: async (ctx: any) => {
    try {
      const { user_name, user_username, user_password } = ctx.body;

      // ตรวจสอบแค่ว่าส่งข้อมูลมาครบไหม
      if (!user_name || !user_username || !user_password) {
        return {
          status: 400,
          success: false,
          message: "Missing required fields",
        };
      }

      // ปรับใหม่: รับรหัสผ่านตรงๆ ไม่จำกัดความยาว (ตัด Regex เดิมออก)
      const password = String(user_password);
      const hashedPassword = await bcrypt.hash(password, 10);

      const sql = `
        INSERT INTO user (user_name, user_username, user_password, is_admin)
        VALUES (?, ?, ?, 0)
      `;

      const [result]: any = await pool.query(sql, [
        user_name,
        user_username,
        hashedPassword,
      ]);

      return {
        status: 201,
        success: true,
        message: "User registered successfully",
        data: {
          user_id: result.insertId,
          user_name,
          user_username,
        },
      };
    } catch (err) {
      console.error("Registration error:", err);
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },

  // เข้าสู่ระบบ
  login: async ({ set, body, jwt, cookie: { auth } }: any) => {
    try {
      const data = (await body.json?.()) ?? body;
      const { user_username, user_password } = data;

      const sql = `SELECT * FROM user WHERE user_username = ? LIMIT 1`;
      const [rows]: any = await pool.query(sql, [user_username]);

      if (!rows || rows.length === 0) {
        set.status = 401;
        return { status: 401, success: false, message: "Invalid username or password" };
      }

      const user = rows[0];
      // ตรวจสอบรหัสผ่าน (แปลงเป็น String ก่อน compare เพื่อความชัวร์)
      const isValid = await bcrypt.compare(String(user_password), user.user_password);

      if (!isValid) {
        set.status = 401;
        return { status: 401, success: false, message: "Invalid username or password" };
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
      set.status = 500;
      return { status: 500, success: false, message: "Internal server error" };
    }
  },
};