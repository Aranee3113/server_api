import { status } from "elysia";
import pool from "../utils/db";

export const product_controller = {
  // เพิ่มสินค้าใหม่ 
  createProduct: async (ctx: any) => {
    try {
      const { textile_name, textile_description, textile_location } = ctx.body;

      if (!textile_name || !textile_description || !textile_location) {
        return {
          status: 400,
          success: false,
          message: "Missing required fields",
        };
      }

      const sql = `
        INSERT INTO textile (textile_name, textile_description, textile_location)
        VALUES (?, ?, ?)
      `;
      const [result]: any = await pool.query(sql, [
        textile_name,
        textile_description,
        textile_location,
      ]);

      return {
        status: 201,
        success: true,
        message: "Product created successfully",
        data: {
          textile_id: result.insertId,
          textile_name,
          textile_description,
          textile_location,
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

  // ดึงสินค้าทั้งหมด
  getAllProducts: async (ctx: any) => {
    try {
      const sql = `
        SELECT textile_id, textile_name, textile_description, textile_location
        FROM textile
      `;
      const [rows]: any = await pool.query(sql);

      if (!rows || rows.length === 0) {
        return {
          status: 204,
          success: true,
          message: "Product data empty",
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

  // ดึงสินค้าโดยใช้ ID
  getProductById: async (ctx: any) => {
    const textileId = ctx.params.id;
    try {
      const sql = `
        SELECT textile_id, textile_name, textile_description, textile_location
        FROM textile
        WHERE textile_id = ?
      `;
      const [rows]: any = await pool.query(sql, [textileId]);

      if (!rows || rows.length === 0) {
        return {
          status: 404,
          success: false,
          message: "Product not found",
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

  // แก้ไขข้อมูลสินค้าโดยใช้ textile_id
  updateProductById: async (ctx: any) => {
    const textileId = ctx.params.id;
    const { textile_name, textile_description, textile_location } = ctx.body;

    if (!textile_name || !textile_description || !textile_location) {
      return {
        status: 400,
        success: false,
        message: "Missing required fields",
      };
    }

    try {
      const sql = `
        UPDATE textile
        SET textile_name = ?, textile_description = ?, textile_location = ?
        WHERE textile_id = ?
      `;

      const [result]: any = await pool.query(sql, [
        textile_name,
        textile_description,
        textile_location,
        textileId,
      ]);

      if (result.affectedRows === 0) {
        return {
          status: 404,
          success: false,
          message: "Product not found",
        };
      }

      return {
        status: 200,
        success: true,
        message: "Product updated successfully",
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

  // ลบสินค้าโดยใช้ textile_id
  deleteProductById: async (ctx: any) => {
    const textileId = ctx.params.id;
    try {
      const sql = `DELETE FROM textile WHERE textile_id = ?`;
      const [result]: any = await pool.query(sql, [textileId]);

      if (result.affectedRows === 0) {
        return {
          status: 404,
          success: false,
          message: "Product not found",
        };
      }

      return {
        status: 200,
        success: true,
        message: "Product deleted successfully",
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
