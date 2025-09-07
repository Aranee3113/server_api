import { jwtDecode } from "jwt-decode";
import type { Context } from "elysia";
import { pool } from "../utils/db";   
import { createSuccessResponse, createErrorResponse } from "../utils/index"; 

const UPDATE_POST_SUMMARY = true;

async function updatePostSummary(post_id: number) {
  if (!UPDATE_POST_SUMMARY) return;
  await pool.query(
    `UPDATE post p
       LEFT JOIN (
         SELECT post_id, COUNT(*) AS cnt, AVG(stars) AS avg_star
         FROM post_rating WHERE post_id = ?
       ) s ON p.post_id = s.post_id
     SET p.rating_count = COALESCE(s.cnt, 0),
         p.rating_avg   = COALESCE(ROUND(s.avg_star, 2), 0)
     WHERE p.post_id = ?`,
    [post_id, post_id]
  );
}

async function readBodyStars(ctx: any): Promise<number | null> {
  try {
    const ct = ctx?.request?.headers?.get("content-type") || "";
    if (ct.includes("application/json")) {
      const b = await ctx.request.json();
      const n = parseInt(b?.stars, 10);
      return Number.isInteger(n) ? n : null;
    } else {
      const fd = await ctx.request.formData();
      const n = parseInt(String(fd.get("stars") ?? ""), 10);
      return Number.isInteger(n) ? n : null;
    }
  } catch {
    return null;
  }
}

export const ratingController = {
  // POST /rating/:postId  { stars:1..5 }  (upsert)
  ratePost: async (ctx: Context) => {
    try {
      const token = ctx.request.headers.get("authorization")?.split(" ")[1];
      if (!token) return createErrorResponse(401, "Unauthorized");

      const decoded: any = jwtDecode(token);
      const user_id = decoded?.userId;
      const post_id = parseInt((ctx.params as any)?.postId ?? (ctx.params as any)?.id, 10);
      const stars = await readBodyStars(ctx);

      if (!user_id || !post_id) return createErrorResponse(400, "Missing post_id or user_id");
      if (stars == null || stars < 1 || stars > 5) return createErrorResponse(400, "stars must be 1-5");

      await pool.query(
        `INSERT INTO post_rating (post_id, user_id, stars)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE stars = VALUES(stars), updated_at = NOW()`,
        [post_id, user_id, stars]
      );

      await updatePostSummary(post_id);
      return createSuccessResponse(200, "rated");
    } catch (err) {
      console.error("ratePost error:", err);
      return createErrorResponse(500, "Internal server error");
    }
  },

  // DELETE /rating/:postId  (ลบคะแนนของตัวเอง)
  deleteMyRating: async (ctx: Context) => {
    try {
      const token = ctx.request.headers.get("authorization")?.split(" ")[1];
      if (!token) return createErrorResponse(401, "Unauthorized");

      const decoded: any = jwtDecode(token);
      const user_id = decoded?.userId;
      const post_id = parseInt((ctx.params as any)?.postId ?? (ctx.params as any)?.id, 10);
      if (!user_id || !post_id) return createErrorResponse(400, "Missing post_id or user_id");

      await pool.query(
        `DELETE FROM post_rating WHERE post_id = ? AND user_id = ?`,
        [post_id, user_id]
      );

      await updatePostSummary(post_id);
      return createSuccessResponse(200, "rating removed");
    } catch (err) {
      console.error("deleteMyRating error:", err);
      return createErrorResponse(500, "Internal server error");
    }
  },

  // GET /rating/:postId/me  (ดึงคะแนนของฉัน)
  getMyRating: async (ctx: Context) => {
    try {
      const token = ctx.request.headers.get("authorization")?.split(" ")[1];
      if (!token) return createErrorResponse(401, "Unauthorized");

      const decoded: any = jwtDecode(token);
      const user_id = decoded?.userId;
      const post_id = parseInt((ctx.params as any)?.postId ?? (ctx.params as any)?.id, 10);

      const [rows]: any = await pool.query(
        `SELECT stars FROM post_rating WHERE post_id = ? AND user_id = ? LIMIT 1`,
        [post_id, user_id]
      );
      return createSuccessResponse(200, rows?.[0] ?? null);
    } catch (err) {
      console.error("getMyRating error:", err);
      return createErrorResponse(500, "Internal server error");
    }
  },

  // GET /rating/:postId/summary  (ดึงสรุปคะแนน)
  getRatingSummary: async (ctx: Context) => {
    try {
      const post_id = parseInt((ctx.params as any)?.postId ?? (ctx.params as any)?.id, 10);
      const [rows]: any = await pool.query(
        `SELECT
           COUNT(*)               AS count,
           ROUND(AVG(stars), 2)   AS avg,
           SUM(stars = 5)         AS s5,
           SUM(stars = 4)         AS s4,
           SUM(stars = 3)         AS s3,
           SUM(stars = 2)         AS s2,
           SUM(stars = 1)         AS s1
         FROM post_rating
         WHERE post_id = ?`,
        [post_id]
      );
      const data =
        rows?.[0] ?? { count: 0, avg: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
      return createSuccessResponse(200, data);
    } catch (err) {
      console.error("getRatingSummary error:", err);
      return createErrorResponse(500, "Internal server error");
    }
  },
};
