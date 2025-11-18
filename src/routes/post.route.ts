import { Elysia } from "elysia";
import { post_controller } from "../controllers/post.controller";

export const postRoutes = new Elysia({ prefix: "/post" })
  // ---- Active routes มาก่อน ----
  .get("/active", post_controller.getPostIsActive)          // GET /post/active
  .put("/active/:id", post_controller.updateStatusActive)   // PUT /post/active/:id

  // ---- routes อื่น ๆ ----
  .get("/", post_controller.getAllposts)                    // GET /post
  // .get("/:id/full", post_controller.getPostWithComments)    // GET /post/:id/full
  .post("/", post_controller.createpost)                    // POST /post
  .put("/:id", post_controller.updatepostById)              // PUT /post/:id
  .delete("/:id", post_controller.deletepostById)           // DELETE /post/:id
  .get("/:id", post_controller.getpostById)                // GET /post/:id


  .get("/video", post_controller.getvideo)
  .post("/video", post_controller.createvideo)
  .put("/video/:id", post_controller.updatevideoById)
  .delete("/video/:id", post_controller.deletevideoById)
  