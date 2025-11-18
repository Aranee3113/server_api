import pool from "../utils/db";
import bcrypt from "bcrypt";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { jwtDecode } from "jwt-decode";

const generateUniqueFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const uuid = uuidv4();
  return `${uuid}${ext}`;
};

const saveUserImage = async (file: any): Promise<string | null> => {
  if (!file || !file.name || !file.size) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = generateUniqueFilename(file.name);
  const uploadDir = path.join(process.cwd(), "public", "uploads", "profile");
  await mkdir(uploadDir, { recursive: true });

  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  return `/uploads/profile/${filename}`;
};

const deleteUserImage = async (imagePath: string): Promise<void> => {
  if (!imagePath) return;
  const fullPath = path.join(process.cwd(), "public", imagePath);
  await unlink(fullPath).catch(() => {});
};

interface ApiResponse<T = any> {
  status: number;
  success: boolean;
  message: string;
  data?: T;
}

const createErrorResponse = (status: number, message: string): ApiResponse => ({
  status,
  success: false,
  message,
});

const createSuccessResponse = (
  status: number,
  message: string,
  data?: any
): ApiResponse => ({
  status,
  success: true,
  message,
  ...(data && { data }),
});

export const user_controller = {
  // ดึงผู้ใช้ทั้งหมด
  getUser: async (ctx: any) => {
    try {
      const [rows]: any = await pool.query(`
        SELECT user_id, user_name, user_username, is_admin, user_image_path
        FROM user
      `);

      return {
        status: 200,
        success: true,
        message: "Success",
        data: rows || [],
      };
    } catch (err) {
      console.error(err);
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
      const [rows]: any = await pool.query(
        `
        SELECT user_id, user_name, user_username, is_admin, user_image_path
        FROM user WHERE user_id = ?
      `,
        [userId]
      );

      if (!rows || rows.length === 0) {
        return {
          status: 404,
          success: false,
          message: "User not found",
        };
      }

      return {
        status: 200,
        success: true,
        message: "Success",
        data: rows[0],
      };
    } catch (err) {
      console.error(err);
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },

  // เพิ่มผู้ใช้พร้อมรูปภาพ
  addUser: async (ctx: any) => {
    const formData = await ctx.request.formData();
    const user_name = formData.get("user_name")?.toString();
    const user_username = formData.get("user_username")?.toString();
    const user_password = formData.get("user_password")?.toString();
    const user_image = formData.get("user_image");

    if (!user_name || !user_username || !user_password) {
      return {
        status: 400,
        success: false,
        message: "Missing required fields",
      };
    }

    try {
      const hashedPassword = await bcrypt.hash(user_password, 10);
      const imagePath = await saveUserImage(user_image);

      const [result]: any = await pool.query(
        `
        INSERT INTO user (user_name, user_username, user_password, is_admin, user_image_path)
        VALUES (?, ?, ?, 0, ?)
      `,
        [user_name, user_username, hashedPassword, imagePath]
      );

      const user_id = result.insertId;

      return {
        status: 201,
        success: true,
        message: "User created successfully",
        data: {
          user_id,
          user_name,
          user_username,
          user_image_path: imagePath,
        },
      };
    } catch (err) {
      console.error(err);
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },

  // แก้ไขผู้ใช้ + อัปเดตรูปใหม่
  updateUserById: async (ctx: any) => {
    const userId = ctx.params.id;
    const formData = await ctx.request.formData();
    const user_name = formData.get("user_name")?.toString();
    const user_username = formData.get("user_username")?.toString();
    const user_password = formData.get("user_password")?.toString();
    const user_image = formData.get("user_image");

    if (!user_name || !user_username) {
      return {
        status: 400,
        success: false,
        message: "Missing required fields",
      };
    }

    try {
      let hashedPassword: string | null = null;
      let imagePath: string | null = null;

      if (user_password) {
        hashedPassword = await bcrypt.hash(user_password, 10);
      }

      // ✅ ดึงข้อมูลเดิมของผู้ใช้ (รวม is_admin และรูปเก่า)
      const [rows]: any = await pool.query(
        `SELECT user_image_path, is_admin FROM user WHERE user_id = ?`,
        [userId]
      );
      if (!rows.length) {
        return {
          status: 404,
          success: false,
          message: "User not found",
        };
      }

      const oldImagePath = rows[0]?.user_image_path;
      const currentIsAdmin = rows[0]?.is_admin ?? 0; // ✅ ใช้ค่าเดิมของ is_admin

      if (user_image && user_image.size > 0) {
        imagePath = await saveUserImage(user_image);
        if (oldImagePath) await deleteUserImage(oldImagePath);
      }

      const fields = ["user_name = ?", "user_username = ?"];
      const values: any[] = [user_name, user_username];

      if (hashedPassword) {
        fields.push("user_password = ?");
        values.push(hashedPassword);
      }

      if (imagePath) {
        fields.push("user_image_path = ?");
        values.push(imagePath);
      }

      // ✅ เก็บสถานะแอดมินเดิมไว้ (ไม่เปลี่ยน)
      fields.push("is_admin = ?");
      values.push(currentIsAdmin, userId);

      const sql = `UPDATE user SET ${fields.join(", ")} WHERE user_id = ?`;
      await pool.query(sql, values);

      return {
        status: 200,
        success: true,
        message: "User updated successfully",
      };
    } catch (err) {
      console.error(err);
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },

  // ลบผู้ใช้ + ลบไฟล์รูปภาพ
  deleteUserById: async (ctx: any) => {
    try {
      const authHeader = ctx.headers?.authorization;
      if (!authHeader)
        return createErrorResponse(401, "Missing authorization header");

      const token = authHeader.split(" ")[1];
      let decoded: any;
      try {
        decoded = jwtDecode(token);
      } catch {
        return createErrorResponse(401, "Invalid token");
      }

      const userIdFromToken = decoded.userId;
      const targetUserId = parseInt(ctx.params.id);
      if (isNaN(targetUserId))
        return createErrorResponse(400, "Invalid user ID");

      // ตรวจสอบว่า user มีอยู่จริงไหม
      const [userRows]: any = await pool.query(
        `SELECT user_id, is_admin, user_image_path FROM user WHERE user_id = ?`,
        [targetUserId]
      );
      if (!userRows.length) return createErrorResponse(404, "User not found");

      const [requesterRows]: any = await pool.query(
        `SELECT is_admin FROM user WHERE user_id = ?`,
        [userIdFromToken]
      );
      if (!requesterRows.length)
        return createErrorResponse(403, "Requester not found or inactive");

      const isAdmin = requesterRows[0].is_admin === 1;
      const isSelf = Number(userIdFromToken) === Number(targetUserId);

      // ตรวจสิทธิ์: ตัวเองลบตัวเองได้ / admin ลบใครก็ได้
      if (!isAdmin && !isSelf)
        return createErrorResponse(
          403,
          "You are not allowed to delete this user"
        );

      // ดึงข้อมูลภาพของ user เพื่อทำการลบไฟล์จริง
      const userImagePath = userRows[0]?.user_image_path;
      if (userImagePath) await deleteUserImage(userImagePath);

      // ลบข้อมูลในตารางลูกที่อ้างถึง user_id (เช่น post, comment, rating)
      await pool.query(`DELETE FROM comment WHERE user_id = ?`, [targetUserId]);
      await pool.query(`DELETE FROM post_rating WHERE user_id = ?`, [
        targetUserId,
      ]);
      await pool.query(`DELETE FROM post WHERE user_id = ?`, [targetUserId]);

      // ลบ user หลัก
      await pool.query(`DELETE FROM user WHERE user_id = ?`, [targetUserId]);

      return createSuccessResponse(200, "User deleted successfully");
    } catch (error: any) {
      console.error("Error deleting user:", error.message || error);
      return createErrorResponse(500, error.message || "Internal server error");
    }
  },
};
