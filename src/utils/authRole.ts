import { Elysia } from "elysia";
import { jwtVerify } from "jose";

/**
 * ✅ Middleware ตรวจสอบสิทธิ์ผู้ใช้จาก JWT
 * @param required ระดับสิทธิ์ที่ต้องการ ("admin" | "member" | "public")
 */
export const authRole = (
  required: "admin" | "member" | "public" = "public"
) => {
  return new Elysia().derive(async (ctx, next) => {
    const authHeader = ctx.request.headers.get("authorization");

    if (!authHeader) {
      ctx.set.status = 401;
      return { success: false, message: "Unauthorized: No token" };
    }

    const token = authHeader.split(" ")[1];
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.JWT_SECRET)
      );

      const is_admin = payload.is_admin;

      // ตรวจระดับสิทธิ์
      switch (required) {
        case "admin":
          if (is_admin !== 1) {
            ctx.set.status = 403;
            return { success: false, message: "Forbidden: Admin only" };
          }
          break;
        case "member":
          if (!(is_admin === 0 || is_admin === 1)) {
            ctx.set.status = 403;
            return { success: false, message: "Forbidden: Members only" };
          }
          break;
        case "public":
          if (is_admin === undefined || is_admin === null) {
            ctx.set.status = 403;
            return { success: false, message: "Forbidden: Login required" };
          }
          break;
      }

      // แนบข้อมูล user ลงใน ctx เพื่อใช้ใน controller ถัดไป
      ctx.user = payload;
      await next();
    } catch (err) {
      ctx.set.status = 401;
      return { success: false, message: "Invalid or expired token" };
    }
  });
};
