import { status } from "elysia";
import pool from "../utils/db";
import { format } from "date-fns";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

interface PostData {
  post_id?: number;
  post_name: string;
  post_description: string;
  post_timestamp: string;
  user_id: string;
  is_active?: number | null;
  images?: Array<{
    post_image_id: number;
    post_image_path: string;
  }>;
}

interface ApiResponse<T = any> {
  status: number;
  success: boolean;
  message: string;
  data?: T;
}

const generateUniqueFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const uuid = uuidv4();
  return `${uuid}${ext}`;
};

const formatTimestamp = (timestamp?: string): string => {
  return timestamp 
    ? format(new Date(timestamp), "yyyy-MM-dd HH:mm:ss")
    : format(new Date(), "yyyy-MM-dd HH:mm:ss");
};

const createErrorResponse = (status: number, message: string): ApiResponse => ({
  status,
  success: false,
  message
});

const createSuccessResponse = (status: number, message: string, data?: any): ApiResponse => ({
  status,
  success: true,
  message,
  ...(data && { data })
});

const saveImageFile = async (file: any, postId: number): Promise<void> => {
  console.log('Processing file:', {
    name: file?.name,
    size: file?.size,
    type: file?.type
  });
  
  if (!file || !file.name || !file.size) {
    console.log('Skipping invalid file');
    return;
  }
  
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = generateUniqueFilename(file.name);
    const filepath = path.join(process.cwd(), "public", "uploads", filename);
    
    console.log('Saving file to:', filepath);
    await writeFile(filepath, buffer);
    
    console.log('Inserting to database:', { postId, filename });
    const [result]: any = await pool.query(
      `INSERT INTO post_image (post_id, post_image_path) VALUES (?, ?)`,
      [postId, filename]
    );
    
    console.log('Database insert result:', result);
  } catch (error) {
    console.error('Error saving image file:', error);
    throw error; 
  }
};

const deleteImageFile = async (imagePath: string): Promise<void> => {
  const filepath = path.join(process.cwd(), "public", "uploads", imagePath);
  await unlink(filepath).catch(() => {
  });
};

export const post_controller = {
// สร้างโพสต์
  createpost: async (ctx: any): Promise<ApiResponse> => {
  try {
    const { post_name, post_description, user_id } = await ctx.body;

    if (!post_name || !post_description || !user_id) {
      return createErrorResponse(400, "Missing required fields");
    }

    const post_timestamp = formatTimestamp();

    const [result]: any = await pool.query(
      `INSERT INTO post (post_name, post_description, post_timestamp, user_id)
       VALUES (?, ?, ?, ?)`,
      [post_name, post_description, post_timestamp, user_id]
    );

    const postId = result.insertId;

    return createSuccessResponse(201, "Post created successfully", {
      post_id: postId,
      post_name,
      post_description,
      post_timestamp,
      user_id,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return createErrorResponse(500, "Internal server error");
  }
},

// แสดงโพสต์
  getAllposts: async (ctx: any): Promise<ApiResponse> => {
    try {
      const sql = `
        SELECT 
          p.post_id, 
          p.post_name, 
          p.post_description, 
          p.post_timestamp, 
          p.user_id, 
          p.is_active,
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'post_image_id', i.post_image_id,
                'post_image_path', i.post_image_path
              )
            )
            FROM post_image i
            WHERE i.post_id = p.post_id
          ) AS images
        FROM post p
        ORDER BY p.post_timestamp DESC
      `;
      
      const [rows]: any = await pool.query(sql);
      
      if (!rows || rows.length === 0) {
        return createSuccessResponse(204, "No posts found", []);
      }
      
      return createSuccessResponse(200, "Posts retrieved successfully", rows);
    } catch (error) {
      console.error("Error getting all posts:", error);
      return createErrorResponse(500, "Internal server error");
    }
  },

// แสดงโพสต์โดยใช้ ID
  getpostById: async (ctx: any): Promise<ApiResponse> => {
    try {
      const postId = parseInt(ctx.params.id);
      
      if (isNaN(postId)) {
        return createErrorResponse(400, "Invalid post ID");
      }

      const sql = `
        SELECT 
          p.post_id, 
          p.post_name, 
          p.post_description, 
          p.post_timestamp, 
          p.user_id, 
          p.is_active,
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'post_image_id', i.post_image_id,
                'post_image_path', i.post_image_path
              )
            )
            FROM post_image i
            WHERE i.post_id = p.post_id
          ) AS images
        FROM post p
        WHERE p.post_id = ?
      `;
      
      const [rows]: any = await pool.query(sql, [postId]);
      
      if (!rows || rows.length === 0) {
        return createErrorResponse(404, "Post not found");
      }
      
      return createSuccessResponse(200, "Post retrieved successfully", rows[0]);
    } catch (error) {
      console.error("Error getting post by ID:", error);
      return createErrorResponse(500, "Internal server error");
    }
  },

  // แก้ไขโพสต์ตาม id
  updatepostById: async (ctx: any): Promise<ApiResponse> => {
    try {
      const postId = parseInt(ctx.params.id);
      
      if (isNaN(postId)) {
        return createErrorResponse(400, "Invalid post ID");
      }

      const formData = await ctx.request.formData();
      const post_name = formData.get("post_name")?.toString();
      const post_description = formData.get("post_description")?.toString();
      const user_id = formData.get("user_id")?.toString();
      const post_timestamp_input = formData.get("post_timestamp")?.toString();
      const files = formData.getAll("post_images");
      const keepImageIds = formData.getAll("keep_image_ids").map(id => parseInt(id.toString()));

      if (!post_name || !post_description || !user_id) {
        return createErrorResponse(400, "Missing required fields");
      }

      const post_timestamp = formatTimestamp(post_timestamp_input);

      await pool.query(
        `UPDATE post SET post_name = ?, post_description = ?, post_timestamp = ?, user_id = ? 
         WHERE post_id = ?`,
        [post_name, post_description, post_timestamp, user_id, postId]
      );

      const [currentImages]: any = await pool.query(
        `SELECT post_image_id, post_image_path FROM post_image WHERE post_id = ?`,
        [postId]
      );

      const deletePromises = currentImages
        .filter((img: any) => !keepImageIds.includes(img.post_image_id))
        .map(async (img: any) => {
          await deleteImageFile(img.post_image_path);
          await pool.query(`DELETE FROM post_image WHERE post_image_id = ?`, [img.post_image_id]);
        });

      await Promise.all(deletePromises);

      const saveImagePromises = files.map((file: any) => saveImageFile(file, postId));
      await Promise.all(saveImagePromises);

      return createSuccessResponse(200, "Post updated successfully");
    } catch (error) {
      console.error("Error updating post:", error);
      return createErrorResponse(500, "Internal server error");
    }
  },

  // ลบโพสต์
  deletepostById: async (ctx: any): Promise<ApiResponse> => {
    try {
      const postId = parseInt(ctx.params.id);
      
      if (isNaN(postId)) {
        return createErrorResponse(400, "Invalid post ID");
      }

      const [images]: any = await pool.query(
        `SELECT post_image_path FROM post_image WHERE post_id = ?`,
        [postId]
      );

      const deleteFilePromises = images.map((image: any) => 
        deleteImageFile(image.post_image_path)
      );
      await Promise.all(deleteFilePromises);

      // Delete from database
      await pool.query(`DELETE FROM post_image WHERE post_id = ?`, [postId]);
      const [result]: any = await pool.query(`DELETE FROM post WHERE post_id = ?`, [postId]);

      if (result.affectedRows === 0) {
        return createErrorResponse(404, "Post not found");
      }

      return createSuccessResponse(200, "Post deleted successfully");
    } catch (error) {
      console.error("Error deleting post:", error);
      return createErrorResponse(500, "Internal server error");
    }
  },

  // แสดงโพสต์ที่อนุมัติ
  getPostIsActive: async (ctx: any): Promise<ApiResponse> => {
    try {
      const sql = `
        SELECT
          post.post_name, 
          post.post_description, 
          post.post_timestamp, 
          user.user_id, 
          user.user_name, 
          user.user_username, 
          post.post_id, 
          post.is_active
        FROM user
        INNER JOIN post ON user.user_id = post.user_id
        WHERE post.is_active = 1
        ORDER BY post.post_timestamp DESC
      `;
      
      const [rows]: any = await pool.query(sql);
      
      if (!rows || rows.length === 0) {
        return createSuccessResponse(204, "No active posts found", []);
      }
      
      return createSuccessResponse(200, "Active posts retrieved successfully", rows);
    } catch (error) {
      console.error("Error getting active posts:", error);
      return createErrorResponse(500, "Internal server error");
    }
  },

  // อัปเดตสถานะพสต์
  updateStatusActive: async (ctx: any): Promise<ApiResponse> => {
    try {
      const postId = parseInt(ctx.params.id);
      
      if (isNaN(postId)) {
        return createErrorResponse(400, "Invalid post ID");
      }

      const [currentStatus]: any = await pool.query(
        "SELECT is_active FROM post WHERE post_id = ?",
        [postId]
      );

      if (!currentStatus || currentStatus.length === 0) {
        return createErrorResponse(404, "Post not found");
      }

      const isActive = currentStatus[0]?.is_active;
      const newStatus = isActive === 1 ? null : 1;

      const [result]: any = await pool.query(
        `UPDATE post SET is_active = ? WHERE post_id = ?`,
        [newStatus, postId]
      );

      if (result.affectedRows === 0) {
        return createErrorResponse(404, "Post not found");
      }

      const message = newStatus === 1 
        ? "Post activated successfully" 
        : "Post deactivated successfully";

      return createSuccessResponse(200, message);
    } catch (error) {
      console.error("Error updating post status:", error);
      return createErrorResponse(500, "Internal server error");
    }
  }
};