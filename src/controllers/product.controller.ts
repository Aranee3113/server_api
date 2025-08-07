import { status } from "elysia";
import pool from "../utils/db";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const generateUniqueFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const uuid = uuidv4();
  return `${uuid}${ext}`;
};

const saveImageFile = async (file: any, productId: number): Promise<void> => {
  if (!file || !file.name || !file.size) return;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = generateUniqueFilename(file.name);
  const filepath = path.join(process.cwd(), "public", "uploads", "textile", filename);
  await writeFile(filepath, buffer);

  const filename_insert = '/uploads/textile/' + filename;

  await pool.query(
    `INSERT INTO textile_image (textile_id, textile_image_path) VALUES (?, ?)`,
    [productId, filename_insert]
  );
};

const deleteImageFile = async (imagePath: string): Promise<void> => {
  const filepath = path.join(process.cwd(), "public", "uploads", imagePath);
  await unlink(filepath).catch(() => {});
};

export const product_controller = {
  //เพิ่มสินค้า
  createProduct: async (ctx: any) => {
    try {
      const formData = await ctx.request.formData();
      const textile_name = formData.get("textile_name")?.toString();
      const textile_description = formData.get("textile_description")?.toString();
      const textile_location = formData.get("textile_location")?.toString();
      const files = formData.getAll("textile_images");

      if (!textile_name || !textile_description || !textile_location) {
        return { status: 400, success: false, message: "Missing required fields" };
      }

      const [result]: any = await pool.query(
        `INSERT INTO textile (textile_name, textile_description, textile_location)
         VALUES (?, ?, ?)`,
        [textile_name, textile_description, textile_location]
      );

      const productId = result.insertId;
      for (const file of files) await saveImageFile(file, productId);

      return {
        status: 201,
        success: true,
        message: "Product created successfully",
        data: { textile_id: productId, textile_name, textile_description, textile_location }
      };
    } catch (err) {
      console.log(err);
      return { status: 500, success: false, message: "Internal server error" };
    }
  },

  //แสดงสินค้าทั้งหมด
  getAllProducts: async (ctx: any) => {
    try {
      const sql = `
         SELECT t.*, (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('textile_image_id', i.textile_image_id, 'textile_image_path', i.textile_image_path))
          FROM textile_image i WHERE i.textile_id = t.textile_id
        ) AS images
        FROM textile t
      `;
      const [rows]: any = await pool.query(sql);
      if (!rows || rows.length === 0) {
        return { status: 204, success: true, message: "Product data empty", data: [] };
      }
      return { status: 200, success: true, message: "Success", data: rows };
    } catch (err) {
      console.log(err);
      return { status: 500, success: false, message: "Internal server error" };
    }
  },

  //แสดงสินค้าตาม ID
  getProductById: async (ctx: any) => {
    try {
      const textileId = ctx.params.id;
      const sql = `
        SELECT t.*, (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('textile_image_id', i.textile_image_id, 'textile_image_path', i.textile_image_path))
          FROM textile_image i WHERE i.textile_id = t.textile_id
        ) AS images
        FROM textile t WHERE t.textile_id = ?
      `;
      const [rows]: any = await pool.query(sql, [textileId]);
      if (!rows || rows.length === 0) {
        return { status: 404, success: false, message: "Product not found", data: null };
      }
      return { status: 200, success: true, message: "Success", data: rows[0] };
    } catch (err) {
      console.log(err);
      return { status: 500, success: false, message: "Internal server error" };
    }
  },

  //แก้ไขสินค้า
  updateProductById: async (ctx: any) => {
    try {
      const textileId = parseInt(ctx.params.id);
      const formData = await ctx.request.formData();
      const textile_name = formData.get("textile_name")?.toString();
      const textile_description = formData.get("textile_description")?.toString();
      const textile_location = formData.get("textile_location")?.toString();
      const files = formData.getAll("textile_images");

      const keepImageIdsRaw = formData.get("keep_image_ids")?.toString() || "";
      const keepImageIds = keepImageIdsRaw
        .split(",")
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));

      if (!textile_name || !textile_description || !textile_location) {
        return { status: 400, success: false, message: "Missing required fields" };
      }

      await pool.query(
        `UPDATE textile SET textile_name = ?, textile_description = ?, textile_location = ? WHERE textile_id = ?`,
        [textile_name, textile_description, textile_location, textileId]
      );

      const [currentImages]: any = await pool.query(
        `SELECT textile_image_id, textile_image_path FROM textile_image WHERE textile_id = ?`,
        [textileId]
      );

      const deletePromises = currentImages
        .filter((img: any) => !keepImageIds.includes(img.textile_image_id))
        .map(async (img: any) => {
          await deleteImageFile(img.textile_image_path);
          await pool.query(`DELETE FROM textile_image WHERE textile_image_id = ?`, [img.textile_image_id]);
        });
      await Promise.all(deletePromises);

      const saveImagePromises = files.map((file: any) => saveImageFile(file, textileId));
      await Promise.all(saveImagePromises);

      return { status: 200, success: true, message: "Product updated successfully" };
    } catch (err) {
      console.log(err);
      return { status: 500, success: false, message: "Internal server error" };
    }
  },

  // ✅ ลบสินค้า + ลบไฟล์ภาพ
  deleteProductById: async (ctx: any) => {
    try {
      const textileId = ctx.params.id;
      const [images]: any = await pool.query(
        `SELECT textile_image_path FROM textile_image WHERE textile_id = ?`,
        [textileId]
      );

      const deleteFilePromises = images.map((img: any) => deleteImageFile(img.textile_image_path));
      await Promise.all(deleteFilePromises);

      await pool.query(`DELETE FROM textile_image WHERE textile_id = ?`, [textileId]);
      const [result]: any = await pool.query(`DELETE FROM textile WHERE textile_id = ?`, [textileId]);

      if (result.affectedRows === 0) {
        return { status: 404, success: false, message: "Product not found" };
      }

      return { status: 200, success: true, message: "Product deleted successfully" };
    } catch (err) {
      console.log(err);
      return { status: 500, success: false, message: "Internal server error" };
    }
  }
};
