import { Elysia } from "elysia";
import { post_controller } from "../controllers/post.controller";
import { authRole } from "../utils/authRole";

export const postRoutes = new Elysia({ prefix: "/post" })
  // 🔒 ส่วนจัดการสถานะโพสต์ (เฉพาะ Admin เท่านั้น)
  .use(authRole("admin"))
  .get("/active", post_controller.getPostIsActive)          // GET /post/active
  .put("/active/:id", post_controller.updateStatusActive)   // PUT /post/active/:id

  // 👀 ทุกคน (รวมถึงผู้ใช้ทั่วไป is_admin = NULL) เข้าดูโพสต์ได้
  .get("/", post_controller.getAllposts)                    // GET /post
  .get("/:id", post_controller.getpostById)                 // GET /post/:id

  // 🧍 สมาชิก (is_admin = 0) และแอดมิน (is_admin = 1) สามารถสร้าง / แก้ไขโพสต์ได้
  .use(authRole("member"))
  .post("/", post_controller.createpost)                    // POST /post
  .put("/:id", post_controller.updatepostById)              // PUT /post/:id

  // 🔒 แอดมินเท่านั้นที่ลบโพสต์ได้
  .use(authRole("admin"))
  .delete("/:id", post_controller.deletepostById)           // DELETE /post/:id

  // 🎥 จัดการวิดีโอ
  // 👀 ทุกคนดูวิดีโอได้
  .get("/video", post_controller.getvideo)                  // GET /post/video

  // 🧍 สมาชิก (0) และแอดมิน (1) อัปโหลด / แก้ไขวิดีโอได้
  .use(authRole("member"))
  .post("/video", post_controller.createvideo)              // POST /post/video
  .put("/video/:id", post_controller.updatevideoById)       // PUT /post/video/:id

  // 🔒 ลบวิดีโอได้เฉพาะแอดมินเท่านั้น
  .use(authRole("admin"))
  .delete("/video/:id", post_controller.deletevideoById);   // DELETE /post/video/:id
