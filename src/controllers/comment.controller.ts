import { pool } from "../utils/db";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { jwtDecode } from "jwt-decode";

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
  const uploadDir = path.join(process.cwd(), "public", "uploads", "comment");
  await mkdir(uploadDir, { recursive: true });
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);
  var filename_insert = "/uploads/comment/" + filename;
  return filename_insert;
};

const deleteCommentImage = async (imagePath: string): Promise<void> => {
  if (!imagePath) return;

  // รองรับทั้งกรณีที่ได้ '/uploads/comment/xxx.jpg' และ 'xxx.jpg'
  const relative = imagePath.startsWith("/uploads/")
    ? imagePath.replace(/^\/+/, "") // ตัด leading slash ออก เพื่อให้ join ได้ผลเป็นภายใต้ public/
    : `uploads/comment/${imagePath}`;

  const absPath = path.join(process.cwd(), "public", relative);
  await unlink(absPath).catch(() => {}); // เงียบทิ้งถ้าไฟล์ไม่มี
};


export const comment_controller = {
  //เพิ่มคอมเมนต์ใหม่
createComment: async (ctx: any): Promise<ApiResponse> => {
  try {
    const authHeader = ctx.headers?.authorization;
    if (!authHeader) {
      return createErrorResponse(401, "Missing authorization header");
    }

    const parts = authHeader.split(" ");
    const token = parts.length === 2 ? parts[1] : parts[0];

    let decoded: any;
    try {
      decoded = jwtDecode(token);
    } catch {
      return createErrorResponse(401, "Invalid token");
    }

    const formData = await ctx.request.formData();
    const post_id = parseInt(formData.get("post_id")?.toString() || "");
    const user_id = decoded.userId;
    const comment_text = formData.get("comment_text")?.toString()?.trim();
    const imageFile = formData.get("comment_image");

    if (!post_id || !user_id || !comment_text) {
      return createErrorResponse(400, "Missing required fields");
    }

    let image_path: string | null = null;
    if (
      imageFile &&
      typeof imageFile !== "string" &&
      typeof (imageFile as any).arrayBuffer === "function"
    ) {
      image_path = await saveCommentImage(imageFile);
    }

    await pool.query(
      `INSERT INTO comment (post_id, user_id, comment_text, comment_image_path)
       VALUES (?, ?, ?, ?)`,
      [post_id, user_id, comment_text, image_path]
    );

    return createSuccessResponse(201, "Comment created successfully", {
      post_id,
      user_id,
      comment_text,
      comment_image_path: image_path,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return createErrorResponse(500, "Internal server error");
  }
},

  //แสดงคอมเมนต์ทั้งหมด
  getAllComments: async (): Promise<ApiResponse> => {
    try {
      const sql = `
        SELECT c.comment_id, c.comment_text, c.comment_image_path, c.comment_timestamp, 
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


  //ลบคอมเมนต์ (และลบรูปออกจากโฟลเดอร์ด้วย)
  deleteCommentById: async (ctx: any): Promise<ApiResponse> => {
  try {
    const authHeader = ctx.headers?.authorization;
    if (!authHeader) return createErrorResponse(401, "Missing authorization header");

    const token = authHeader.split(" ")[1] || authHeader;
    let decoded: any;
    try {
      decoded = jwtDecode(token);
    } catch {
      return createErrorResponse(401, "Invalid token");
    }
    const currentUserId = decoded.userId;

    const commentId = parseInt(ctx.params.id);
    const [rows]: any = await pool.query(
      `SELECT user_id, comment_image_path FROM comment WHERE comment_id = ?`,
      [commentId]
    );
    if (!rows.length) return createErrorResponse(404, "Comment not found");
    if (rows[0].user_id !== currentUserId) {
      return createErrorResponse(403, "You can only delete your own comments");
    }

    const imagePath = rows[0]?.comment_image_path;
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
    const authHeader = ctx.headers?.authorization;
    if (!authHeader) return createErrorResponse(401, "Missing authorization header");

    const token = authHeader.split(" ")[1] || authHeader;
    let decoded: any;
    try {
      decoded = jwtDecode(token);
    } catch {
      return createErrorResponse(401, "Invalid token");
    }
    const currentUserId = decoded.userId;

    const commentId = parseInt(ctx.params.id);

    // ตรวจสอบว่าเป็นเจ้าของคอมเมนต์
    const [rows]: any = await pool.query(
      `SELECT user_id, comment_image_path FROM comment WHERE comment_id = ?`,
      [commentId]
    );
    if (!rows.length) return createErrorResponse(404, "Comment not found");
    if (rows[0].user_id !== currentUserId) {
      return createErrorResponse(403, "You can only edit your own comments");
    }

    const oldImage = rows[0]?.comment_image_path as string | null;

    const formData = await ctx.request.formData();
    const comment_text = formData.get("comment_text")?.toString() ?? "";
    const removeImageFlag =
      (formData.get("remove_image")?.toString() || "") === "1";
    const imageFile = formData.get("comment_image") as any | null;

    let newImagePath: string | null = null;

    // ถ้ามีไฟล์ใหม่ → ลบรูปเก่า แล้วบันทึกไฟล์ใหม่
    if (imageFile && typeof imageFile !== "string" && typeof imageFile.arrayBuffer === "function") {
      if (oldImage) await deleteCommentImage(oldImage);
      newImagePath = await saveCommentImage(imageFile);
    } else if (removeImageFlag) {
      // ถ้าระบุให้ลบภาพ → ลบรูปเก่า แล้ว set เป็น NULL
      if (oldImage) await deleteCommentImage(oldImage);
      newImagePath = null;
    }

    // สร้าง SQL ตามเคส
    if (imageFile && newImagePath) {
      await pool.query(
        `UPDATE comment SET comment_text = ?, comment_image_path = ? WHERE comment_id = ?`,
        [comment_text, newImagePath, commentId]
      );
    } else if (removeImageFlag) {
      await pool.query(
        `UPDATE comment SET comment_text = ?, comment_image_path = NULL WHERE comment_id = ?`,
        [comment_text, commentId]
      );
    } else {
      await pool.query(
        `UPDATE comment SET comment_text = ? WHERE comment_id = ?`,
        [comment_text, commentId]
      );
    }

    return createSuccessResponse(200, "Comment updated");
  } catch (error) {
    console.error("Error updating comment:", error);
    return createErrorResponse(500, "Internal server error");
  }
},
};
