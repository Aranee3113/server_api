import { Elysia } from "elysia";
import { comment_controller } from "../controllers/comment.controller";

export const commentRoutes = new Elysia({ prefix: "/comment" })
  .post("/", comment_controller.createComment) // POST /comment
  .get("/active", comment_controller.getAllActiveComments) // GET /comment/active
  .get("/", comment_controller.getAllComments) // GET /comment
  .put("/active/:id", comment_controller.updateStatusCommentActive) // PUT /comment/active/:id
  .put("/:id", comment_controller.updateCommentById) // PUT /comment/:id
  .delete("/:id", comment_controller.deleteCommentById); // DELETE /comment/:id
