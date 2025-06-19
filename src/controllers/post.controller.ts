import { status } from "elysia";
import pool from "../utils/db";
import { format } from "date-fns";

export const post_controller = {
  // เพิ่มโพสต์ใหม่
  createpost: async (ctx: any) => {
    try {
      let { post_name, post_description, post_timestamp, user_id } = ctx.body;

      if (!post_name || !post_description || !user_id) {
        return {
          status: 400,
          success: false,
          message: "Missing required fields",
        };
      }

      // ถ้ามี post_timestamp ให้จัดรูปแบบ ถ้าไม่มีกำหนดเวลาปัจจุบันอัตโนมัติ
      post_timestamp = post_timestamp
        ? format(new Date(post_timestamp), "yyyy-MM-dd HH:mm:ss")
        : format(new Date(), "yyyy-MM-dd HH:mm:ss");

      const sql = `
        INSERT INTO post (post_name, post_description, post_timestamp, user_id)
        VALUES (?, ?, ?, ?)
      `;
      const [result]: any = await pool.query(sql, [
        post_name,
        post_description,
        post_timestamp,
        user_id,
      ]);

      return {
        status: 201,
        success: true,
        message: "Post created successfully",
        data: {
          post_id: result.insertId,
          post_name,
          post_description,
          post_timestamp,
          user_id,
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

  // ดึงโพสต์ทั้งหมด
  getAllposts: async (ctx: any) => {
    try {
      const sql = `
        SELECT post_id, post_name, post_description, post_timestamp, user_id
        FROM post
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

  // ดึงโพสต์โดยใช้ ID
  getpostById: async (ctx: any) => {
    const postId = parseInt(ctx.params.id);
    try {
      const sql = `
        SELECT post_id, post_name, post_description, post_timestamp, user_id
        FROM post
        WHERE post_id = ?
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

  // แก้ไขข้อมูลโพสต์โดยใช้ post_id
  updatepostById: async (ctx: any) => {
    const postId = parseInt(ctx.params.id);
    let { post_name, post_description, post_timestamp, user_id } = ctx.body;

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
      const sql = `
        UPDATE post
        SET post_name = ?, post_description = ?, post_timestamp = ?, user_id = ?
        WHERE post_id = ?
      `;

      const [result]: any = await pool.query(sql, [
        post_name,
        post_description,
        post_timestamp,
        user_id,
        postId,
      ]);

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
        message: "Post updated successfully",
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

  // ลบโพสต์โดยใช้ post_id
  deletepostById: async (ctx: any) => {
    const postId = parseInt(ctx.params.id);
    try {
      const sql = `DELETE FROM post WHERE post_id = ?`;
      const [result]: any = await pool.query(sql, [postId]);

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
        message: "Post deleted successfully",
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
                        post.is_active
                    FROM
                        user
                        INNER JOIN
                        post
                        ON 
                            user.user_id = post.user_id
                        WHERE 
                            post.is_active = 1
      `;
      const [rows]: any = await pool.query(sql);

      if (!rows || rows.length === 0) {
        return {
          status: 204,
          success: true,
          message: "Post data not found ",
          data: [],
        };
      }

      return {
        status: 200,
        success: true,
        message: "Success",
        data: rows,
      };
    } catch (error) {}
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
