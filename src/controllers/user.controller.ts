import pool from "../utils/db";
import bcrypt from "bcrypt";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

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
      const [rows]: any = await pool.query(`
        SELECT user_id, user_name, user_username, is_admin, user_image_path
        FROM user WHERE user_id = ?
      `, [userId]);

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

      const [result]: any = await pool.query(`
        INSERT INTO user (user_name, user_username, user_password, is_admin, user_image_path)
        VALUES (?, ?, ?, 0, ?)
      `, [user_name, user_username, hashedPassword, imagePath]);

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

      // ดึง path รูปเก่า
      const [rows]: any = await pool.query(
        `SELECT user_image_path FROM user WHERE user_id = ?`,
        [userId]
      );
      const oldImagePath = rows[0]?.user_image_path;

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

      fields.push("is_admin = ?");
      values.push(0, userId);

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
    const userId = ctx.params.id;
    try {
      const [rows]: any = await pool.query(
        `SELECT user_image_path FROM user WHERE user_id = ?`,
        [userId]
      );
      const imagePath = rows[0]?.user_image_path;

      if (imagePath) await deleteUserImage(imagePath);

      const [result]: any = await pool.query(
        `DELETE FROM user WHERE user_id = ?`,
        [userId]
      );

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
      console.error(err);
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },
};
