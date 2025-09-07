import { jwtDecode } from "jwt-decode";
import type { Context } from "elysia";
import { pool } from "../utils/db";
import { createSuccessResponse, createErrorResponse } from "../utils/index";

const UPDATE_TEXTILE_SUMMARY = true;

async function updateTextileSummary(textile_id: number) {
  if (!UPDATE_TEXTILE_SUMMARY) return;
  await pool.query(
    `UPDATE textile t
       LEFT JOIN (
         SELECT textile_id, COUNT(*) AS cnt, AVG(stars) AS avg_star
           FROM textile_rating
          WHERE textile_id = ?
       ) s ON t.textile_id = s.textile_id
     SET t.rating_count = COALESCE(s.cnt, 0),
         t.rating_avg   = COALESCE(ROUND(s.avg_star, 2), 0)
     WHERE t.textile_id = ?`,
    [textile_id, textile_id]
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

export const textileRatingController = {
  // POST /textile-rating/:textileId  { stars:1..5 } (upsert)
  rate: async (ctx: Context) => {
    try {
      const token = ctx.request.headers.get("authorization")?.split(" ")[1];
      if (!token) return createErrorResponse(401, "Unauthorized");

      const decoded: any = jwtDecode(token);
      const user_id = decoded?.userId;
      const textile_id = parseInt((ctx.params as any)?.textileId ?? (ctx.params as any)?.id, 10);
      const stars = await readBodyStars(ctx);

      if (!user_id || !textile_id) return createErrorResponse(400, "Missing textile_id or user_id");
      if (stars == null || stars < 1 || stars > 5) return createErrorResponse(400, "stars must be 1-5");

      await pool.query(
        `INSERT INTO textile_rating (textile_id, user_id, stars)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE stars = VALUES(stars), updated_at = NOW()`,
        [textile_id, user_id, stars]
      );

      await updateTextileSummary(textile_id);
      return createSuccessResponse(200, "rated");
    } catch (err) {
      console.error("textile rate error:", err);
      return createErrorResponse(500, "Internal server error");
    }
  },

  // DELETE /textile-rating/:textileId  (ลบดาวของตัวเอง)
  deleteMine: async (ctx: Context) => {
    try {
      const token = ctx.request.headers.get("authorization")?.split(" ")[1];
      if (!token) return createErrorResponse(401, "Unauthorized");

      const decoded: any = jwtDecode(token);
      const user_id = decoded?.userId;
      const textile_id = parseInt((ctx.params as any)?.textileId ?? (ctx.params as any)?.id, 10);

      if (!user_id || !textile_id) return createErrorResponse(400, "Missing textile_id or user_id");

      await pool.query(
        `DELETE FROM textile_rating WHERE textile_id = ? AND user_id = ?`,
        [textile_id, user_id]
      );

      await updateTextileSummary(textile_id);
      return createSuccessResponse(200, "rating removed");
    } catch (err) {
      console.error("textile delete error:", err);
      return createErrorResponse(500, "Internal server error");
    }
  },

  // GET /textile-rating/:textileId/summary  (avg, count)
  summary: async (ctx: Context) => {
    try {
      const textile_id = parseInt((ctx.params as any)?.textileId ?? (ctx.params as any)?.id, 10);
      const [rows]: any = await pool.query(
        `SELECT
           COUNT(*)               AS count,
           ROUND(AVG(stars), 2)   AS avg,
           SUM(stars = 5)         AS s5,
           SUM(stars = 4)         AS s4,
           SUM(stars = 3)         AS s3,
           SUM(stars = 2)         AS s2,
           SUM(stars = 1)         AS s1
         FROM textile_rating
         WHERE textile_id = ?`,
        [textile_id]
      );
      const data = rows?.[0] ?? { count: 0, avg: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
      return createSuccessResponse(200, data);
    } catch (err) {
      console.error("textile summary error:", err);
      return createErrorResponse(500, "Internal server error");
    }
  },
};
