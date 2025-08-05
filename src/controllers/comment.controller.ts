import pool from "../utils/db";
import { format } from "date-fns";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

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

const generateUniqueFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const uuid = uuidv4();
  return `${uuid}${ext}`;
};

const saveCommentImage = async (file: any): Promise<string | null> => {
  if (!file || !file.name || !file.size) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = generateUniqueFilename(file.name);
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);
  return filename;
};

const deleteCommentImage = async (imagePath: string): Promise<void> => {
  if (!imagePath) return;
  const filepath = path.join(process.cwd(), "public", "uploads", imagePath);
  await unlink(filepath).catch(() => {}); // ignore error if file doesn't exist
};

export const comment_controller = {
  //เพิ่มคอมเมนต์ใหม่
  createComment: async (ctx: any): Promise<ApiResponse> => {
    try {
      const formData = await ctx.request.formData();
      const post_id = parseInt(formData.get("post_id")?.toString() || "");
      const user_id = parseInt(formData.get("user_id")?.toString() || "");
      const comment_text = formData.get("comment_text")?.toString();
      const imageFile = formData.get("comment_image");

      if (!post_id || !user_id || !comment_text) {
        return createErrorResponse(400, "Missing required fields");
      }

      const image_path = await saveCommentImage(imageFile);

      await pool.query(
        `INSERT INTO comment (post_id, user_id, comment_text, comment_image_path, is_active)
         VALUES (?, ?, ?, ?, 0)`,
        [post_id, user_id, comment_text, image_path]
      );

      return createSuccessResponse(201, "Comment submitted for approval");
    } catch (error) {
      console.error("Error creating comment:", error);
      return createErrorResponse(500, "Internal server error");
    }
  },

  // แสดงคอมเมนต์ที่อนุมัติแล้วทั้งหมด
getAllActiveComments: async (): Promise<ApiResponse> => {
  try {
    const sql = `
      SELECT 
        c.comment_id,
        c.comment_text,
        c.comment_image_path,
        c.comment_timestamp,
        u.user_id,
        u.user_name,
        p.post_id,
        p.post_name
      FROM comment c
      INNER JOIN user u ON u.user_id = c.user_id
      INNER JOIN post p ON p.post_id = c.post_id
      WHERE c.is_active = 1
      ORDER BY c.comment_timestamp DESC
    `;

    const [rows]: any = await pool.query(sql);

    if (!rows || rows.length === 0) {
      return createSuccessResponse(204, "No active comments found", []);
    }

    return createSuccessResponse(200, "Active comments retrieved successfully", rows);
  } catch (error) {
    console.error("Error getting active comments:", error);
    return createErrorResponse(500, "Internal server error");
  }
},

  //แสดงคอมเมนต์ทั้งหมด
  getAllComments: async (): Promise<ApiResponse> => {
    try {
      const sql = `
        SELECT c.comment_id, c.comment_text, c.comment_image_path, c.comment_timestamp, c.is_active,
               p.post_id, p.post_name,
               u.user_id, u.user_name
        FROM comment c
        JOIN user u ON u.user_id = c.user_id
        JOIN post p ON p.post_id = c.post_id
        ORDER BY c.comment_timestamp DESC
      `;
      const [rows]: any = await pool.query(sql);
      return createSuccessResponse(200, "All comments", rows);
    } catch (error) {
      console.error("Error fetching all comments:", error);
      return createErrorResponse(500, "Internal server error");
    }
  },

  //อัปเดตสถานะ is_active
  updateStatusCommentActive: async (ctx: any): Promise<ApiResponse> => {
    try {
      const commentId = parseInt(ctx.params.id);
      const [current]: any = await pool.query(
        `SELECT is_active FROM comment WHERE comment_id = ?`,
        [commentId]
      );
      const newStatus = current[0].is_active === 1 ? null : 1;
      await pool.query(
        `UPDATE comment SET is_active = ? WHERE comment_id = ?`,
        [newStatus, commentId]
      );
      return createSuccessResponse(
        200,
        newStatus === 1 ? "Comment approved" : "Comment unapproved"
      );
    } catch (error) {
      console.error("Error updating comment status:", error);
      return createErrorResponse(500, "Internal server error");
    }
  },

  //ลบคอมเมนต์ (และลบรูปออกจากโฟลเดอร์ด้วย)
  deleteCommentById: async (ctx: any): Promise<ApiResponse> => {
    try {
      const commentId = parseInt(ctx.params.id);
      const [row]: any = await pool.query(
        `SELECT comment_image_path FROM comment WHERE comment_id = ?`,
        [commentId]
      );
      const imagePath = row[0]?.comment_image_path;
      if (imagePath) await deleteCommentImage(imagePath);
      await pool.query(`DELETE FROM comment WHERE comment_id = ?`, [commentId]);
      return createSuccessResponse(200, "Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      return createErrorResponse(500, "Internal server error");
    }
  },

  //แก้ไขข้อความคอมเมนต์ และรูปใหม่ (ถ้ามี)
  updateCommentById: async (ctx: any): Promise<ApiResponse> => {
    try {
      const commentId = parseInt(ctx.params.id);
      const formData = await ctx.request.formData();
      const comment_text = formData.get("comment_text")?.toString();
      const imageFile = formData.get("comment_image");

      let image_path: string | null = null;
      if (imageFile && imageFile.name && imageFile.size) {
        // ลบรูปเก่า (ถ้ามี)
        const [row]: any = await pool.query(
          `SELECT comment_image_path FROM comment WHERE comment_id = ?`,
          [commentId]
        );
        const oldImage = row[0]?.comment_image_path;
        if (oldImage) await deleteCommentImage(oldImage);

        image_path = await saveCommentImage(imageFile);
      }

      const updateSql = image_path
        ? `UPDATE comment SET comment_text = ?, comment_image_path = ? WHERE comment_id = ?`
        : `UPDATE comment SET comment_text = ? WHERE comment_id = ?`;
      const updateParams = image_path
        ? [comment_text, image_path, commentId]
        : [comment_text, commentId];

      await pool.query(updateSql, updateParams);
      return createSuccessResponse(200, "Comment updated");
    } catch (error) {
      console.error("Error updating comment:", error);
      return createErrorResponse(500, "Internal server error");
    }
  },
};
