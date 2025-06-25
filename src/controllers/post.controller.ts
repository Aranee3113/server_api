import { status } from "elysia";
import pool from "../utils/db";
import { format } from "date-fns";
import fs from "fs/promises";
import path from "path";

// Helper function สำหรับจัดการไฟล์รูปภาพ
const fileHelpers = {
  // บันทึกไฟล์รูปภาพ
  saveImageFile: async (file: File, uploadDir: string = "uploads"): Promise<string> => {
    try {
      // สร้างชื่อไฟล์ที่ไม่ซ้ำ
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = path.extname(file.name);
      const fileName = `${timestamp}_${randomString}${fileExtension}`;
      
      // สร้าง directory ถ้ายังไม่มี
      await fs.mkdir(uploadDir, { recursive: true });
      
      // เขียนไฟล์
      const filePath = path.join(uploadDir, fileName);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, buffer);
      
      return fileName;
    } catch (error) {
      console.error("Error saving file:", error);
      throw new Error("Failed to save image file");
    }
  },

  // ลบไฟล์รูปภาพ
  deleteImageFile: async (fileName: string, uploadDir: string = "uploads"): Promise<boolean> => {
    try {
      if (!fileName) return true;
      
      const filePath = path.join(uploadDir, fileName);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  },

  // ตรวจสอบว่าไฟล์เป็นรูปภาพหรือไม่
  isValidImageFile: (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    return allowedTypes.includes(file.type) && file.size <= maxSize;
  },

  // ดึงรายการรูปภาพของโพสต์
  getPostImages: async (postId: number): Promise<string[]> => {
    try {
      const sql = `SELECT post_image_path FROM post_image WHERE post_id = ?`;
      const [rows]: any = await pool.query(sql, [postId]);
      return rows.map((row: any) => row.post_image_path);
    } catch (error) {
      console.error("Error getting post images:", error);
      return [];
    }
  }
};

export const post_controller = {
  // เพิ่มโพสต์ใหม่
  createpost: async (ctx: any) => {
    try {
      let {
        post_name,
        post_description,
        post_timestamp,
        user_id,
        post_images, // array of image files
      } = ctx.body;

      if (!post_name || !post_description || !user_id) {
        return {
          status: 400,
          success: false,
          message: "Missing required fields",
        };
      }

      // จัดรูปแบบเวลา
      post_timestamp = post_timestamp
        ? format(new Date(post_timestamp), "yyyy-MM-dd HH:mm:ss")
        : format(new Date(), "yyyy-MM-dd HH:mm:ss");

      await pool.query("START TRANSACTION");

      // เพิ่มข้อมูลโพสต์
      const sqlInsertPost = `
        INSERT INTO post (post_name, post_description, post_timestamp, user_id)
        VALUES (?, ?, ?, ?)
      `;
      const [result]: any = await pool.query(sqlInsertPost, [
        post_name,
        post_description,
        post_timestamp,
        user_id,
      ]);
      const post_id = result.insertId;

      // จัดการรูปภาพ
      const savedImagePaths: string[] = [];
      if (post_images && Array.isArray(post_images)) {
        const sqlInsertImage = `
          INSERT INTO post_image (post_image_path, post_id)
          VALUES (?, ?)
        `;
        
        for (const imageFile of post_images) {
          // ตรวจสอบว่าเป็นไฟล์รูปภาพที่ถูกต้อง
          if (imageFile instanceof File && fileHelpers.isValidImageFile(imageFile)) {
            try {
              const savedFileName = await fileHelpers.saveImageFile(imageFile);
              await pool.query(sqlInsertImage, [savedFileName, post_id]);
              savedImagePaths.push(savedFileName);
            } catch (error) {
              console.error("Error saving image:", error);
              // ถ้าบันทึกไฟล์ไม่สำเร็จ ให้ rollback
              await pool.query("ROLLBACK");
              return {
                status: 500,
                success: false,
                message: "Failed to save image files",
              };
            }
          } else if (typeof imageFile === 'string') {
            // กรณีที่ส่งมาเป็น string (path ของรูปภาพที่มีอยู่แล้ว)
            await pool.query(sqlInsertImage, [imageFile, post_id]);
            savedImagePaths.push(imageFile);
          }
        }
      }

      await pool.query("COMMIT");

      return {
        status: 201,
        success: true,
        message: "Post created successfully",
        data: {
          post_id,
          post_name,
          post_description,
          post_timestamp,
          user_id,
          post_images: savedImagePaths,
        },
      };
    } catch (err) {
      await pool.query("ROLLBACK");
      console.log(err);
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },

  // ดึงโพสต์ทั้งหมด
  getAllposts: async (ctx: any) => {
    try {
      const sql = `
        SELECT 
          p.post_id,
          p.post_name,
          p.post_description,
          p.post_timestamp,
          p.user_id,
          GROUP_CONCAT(pi.post_image_path) as post_image_paths
        FROM post p
        LEFT JOIN post_image pi ON p.post_id = pi.post_id
        GROUP BY p.post_id
        ORDER BY p.post_timestamp DESC
      `;
      const [rows]: any = await pool.query(sql);

      if (!rows || rows.length === 0) {
        return {
          status: 204,
          success: true,
          message: "Post data empty",
          data: [],
        };
      }

      const updatedRows = rows.map((row: any) => ({
        ...row,
        post_images: row.post_image_paths 
          ? row.post_image_paths.split(',').map((path: string) => ({
              filename: path,
              url: `http://localhost:8008/uploads/${path}`
            }))
          : [],
        post_image_paths: undefined, // ลบ field นี้ออก
      }));

      return {
        status: 200,
        success: true,
        message: "Success",
        data: updatedRows,
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

  // ดึงโพสต์โดยใช้ ID
  getpostById: async (ctx: any) => {
    const postId = parseInt(ctx.params.id);
    try {
      const sql = `
        SELECT 
          p.post_id,
          p.post_name,
          p.post_description,
          p.post_timestamp,
          p.user_id,
          GROUP_CONCAT(pi.post_image_path) as post_image_paths
        FROM post p
        LEFT JOIN post_image pi ON p.post_id = pi.post_id
        WHERE p.post_id = ?
        GROUP BY p.post_id
      `;
      const [rows]: any = await pool.query(sql, [postId]);

      if (!rows || rows.length === 0) {
        return {
          status: 404,
          success: false,
          message: "Post not found",
          data: null,
        };
      }

      const post = rows[0];
      return {
        status: 200,
        success: true,
        message: "Success",
        data: {
          ...post,
          post_images: post.post_image_paths 
            ? post.post_image_paths.split(',').map((path: string) => ({
                filename: path,
                url: `http://localhost:8008/uploads/${path}`
              }))
            : [],
          post_image_paths: undefined, // ลบ field นี้ออก
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

  // แก้ไขข้อมูลโพสต์โดยใช้ post_id
  updatepostById: async (ctx: any) => {
    const postId = parseInt(ctx.params.id);
    let { 
      post_name, 
      post_description, 
      post_timestamp, 
      user_id, 
      post_images, // new image files
      keep_images, // array of existing image filenames to keep
      remove_images // array of image filenames to remove
    } = ctx.body;

    if (!post_name || !post_description || !user_id) {
      return {
        status: 400,
        success: false,
        message: "Missing required fields",
      };
    }

    post_timestamp = post_timestamp
      ? format(new Date(post_timestamp), "yyyy-MM-dd HH:mm:ss")
      : format(new Date(), "yyyy-MM-dd HH:mm:ss");

    try {
      await pool.query("START TRANSACTION");

      // อัปเดตข้อมูลโพสต์
      const sqlUpdatePost = `
        UPDATE post
        SET post_name = ?, post_description = ?, post_timestamp = ?, user_id = ?
        WHERE post_id = ?
      `;

      const [result]: any = await pool.query(sqlUpdatePost, [
        post_name,
        post_description,
        post_timestamp,
        user_id,
        postId,
      ]);

      if (result.affectedRows === 0) {
        await pool.query("ROLLBACK");
        return {
          status: 404,
          success: false,
          message: "Post not found",
        };
      }

      // ได้รายการรูปภาพเดิมทั้งหมด
      const existingImages = await fileHelpers.getPostImages(postId);

      // ลบรูปภาพที่ระบุให้ลบ
      if (remove_images && Array.isArray(remove_images)) {
        for (const imageToRemove of remove_images) {
          if (existingImages.includes(imageToRemove)) {
            // ลบจากฐานข้อมูล
            await pool.query(
              `DELETE FROM post_image WHERE post_id = ? AND post_image_path = ?`, 
              [postId, imageToRemove]
            );
            // ลบไฟล์
            await fileHelpers.deleteImageFile(imageToRemove);
          }
        }
      }

      // เพิ่มรูปภาพใหม่
      const savedImagePaths: string[] = [];
      if (post_images && Array.isArray(post_images)) {
        const sqlInsertImage = `
          INSERT INTO post_image (post_image_path, post_id)
          VALUES (?, ?)
        `;
        
        for (const imageFile of post_images) {
          if (imageFile instanceof File && fileHelpers.isValidImageFile(imageFile)) {
            try {
              const savedFileName = await fileHelpers.saveImageFile(imageFile);
              await pool.query(sqlInsertImage, [savedFileName, postId]);
              savedImagePaths.push(savedFileName);
            } catch (error) {
              console.error("Error saving new image:", error);
              await pool.query("ROLLBACK");
              return {
                status: 500,
                success: false,
                message: "Failed to save new image files",
              };
            }
          }
        }
      }

      await pool.query("COMMIT");

      return {
        status: 200,
        success: true,
        message: "Post and images updated successfully",
        data: {
          post_id: postId,
          new_images_added: savedImagePaths,
          images_removed: remove_images || [],
        },
      };
    } catch (err) {
      await pool.query("ROLLBACK");
      console.log(err);
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },

  // ลบโพสต์โดยใช้ post_id
  deletepostById: async (ctx: any) => {
    const postId = parseInt(ctx.params.id);
    try {
      await pool.query("START TRANSACTION");

      // ได้รายการรูปภาพที่ต้องลบ
      const imagesToDelete = await fileHelpers.getPostImages(postId);

      // ลบโพสต์ (จะลบรูปภาพใน post_image table ด้วย เนื่องจาก foreign key constraint)
      const sql = `DELETE FROM post WHERE post_id = ?`;
      const [result]: any = await pool.query(sql, [postId]);

      if (result.affectedRows === 0) {
        await pool.query("ROLLBACK");
        return {
          status: 404,
          success: false,
          message: "Post not found",
        };
      }

      // ลบไฟล์รูปภาพทั้งหมด
      for (const imagePath of imagesToDelete) {
        await fileHelpers.deleteImageFile(imagePath);
      }

      await pool.query("COMMIT");

      return {
        status: 200,
        success: true,
        message: "Post and associated images deleted successfully",
      };
    } catch (err) {
      await pool.query("ROLLBACK");
      console.log(err);
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },

  // ลบรูปภาพเฉพาะ
  deleteImageById: async (ctx: any) => {
    const { postId, imagePath } = ctx.params;
    
    try {
      await pool.query("START TRANSACTION");

      // ตรวจสอบว่ารูปภาพนี้เป็นของโพสต์นี้จริงหรือไม่
      const checkSql = `
        SELECT post_image_path FROM post_image 
        WHERE post_id = ? AND post_image_path = ?
      `;
      const [checkResult]: any = await pool.query(checkSql, [postId, imagePath]);

      if (!checkResult || checkResult.length === 0) {
        await pool.query("ROLLBACK");
        return {
          status: 404,
          success: false,
          message: "Image not found for this post",
        };
      }

      // ลบจากฐานข้อมูล
      const deleteSql = `
        DELETE FROM post_image 
        WHERE post_id = ? AND post_image_path = ?
      `;
      await pool.query(deleteSql, [postId, imagePath]);

      // ลบไฟล์
      await fileHelpers.deleteImageFile(imagePath);

      await pool.query("COMMIT");

      return {
        status: 200,
        success: true,
        message: "Image deleted successfully",
      };
    } catch (err) {
      await pool.query("ROLLBACK");
      console.log(err);
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },

  getPostIsActive: async (ctx: any) => {
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
          post.is_active,
          GROUP_CONCAT(pi.post_image_path) as post_image_paths
        FROM user
        INNER JOIN post ON user.user_id = post.user_id
        LEFT JOIN post_image pi ON post.post_id = pi.post_id
        WHERE post.is_active = 1
        GROUP BY post.post_id
        ORDER BY post.post_timestamp DESC
      `;
      const [rows]: any = await pool.query(sql);

      if (!rows || rows.length === 0) {
        return {
          status: 204,
          success: true,
          message: "Post data not found",
          data: [],
        };
      }

      const updatedRows = rows.map((row: any) => ({
        ...row,
        post_images: row.post_image_paths 
          ? row.post_image_paths.split(',').map((path: string) => ({
              filename: path,
              url: `http://localhost:8008/uploads/${path}`
            }))
          : [],
        post_image_paths: undefined, // ลบ field นี้ออก
      }));

      return {
        status: 200,
        success: true,
        message: "Success",
        data: updatedRows,
      };
    } catch (error) {
      console.log(error);
      return {
        status: 500,
        success: false,
        message: "Internal server error",
      };
    }
  },

  updateStatusActive: async (ctx: any) => {
    const postId = parseInt(ctx.params.id);
    console.log(postId);

    try {
      const sql = `
        UPDATE post
        SET is_active = 1
        WHERE post_id = ?
      `;

      const [result]: any = await pool.query(sql, [postId]);
      console.log(result);

      if (result.affectedRows === 0) {
        return {
          status: 404,
          success: false,
          message: "Post not found",
        };
      }

      return {
        status: 200,
        success: true,
        message: "Post updated to active successfully",
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