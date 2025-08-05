import { Elysia } from "elysia";
import { post_controller } from "../controllers/post.controller";

export const postRoutes = new Elysia({ prefix: "/post" })
  .get("/", post_controller.getAllposts)                // GET /post
  .get("/:id", post_controller.getpostById)             // GET /post/:id
  .post("/", post_controller.createpost)                // POST /post
  .put("/:id", post_controller.updatepostById)          // PUT /post/:id
  .delete("/:id", post_controller.deletepostById)      // DELETE /post/:id
  .get("/active", post_controller.getPostIsActive)        // GET /post is active
  .put("/active/:id", post_controller.updateStatusActive)
  .get("/:id/full", post_controller.getPostWithComments) // GET /post/:id/full
