import { Elysia } from "elysia";
import { comment_controller } from "../controllers/comment.controller";

export const commentRoutes = new Elysia({ prefix: "/comment" })
  .post("/", comment_controller.createComment) // POST /comment
  .get("/", comment_controller.getAllComments) // GET /comment
  .put("/:id", comment_controller.updateCommentById) // PUT /comment/:id
  .delete("/:id", comment_controller.deleteCommentById); // DELETE /comment/:id
