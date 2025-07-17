import Elysia from "elysia";
import { user_controller } from "../controllers/user.controller";

export const user_route = (app: Elysia) =>
  app.group(
    "/user",
    (app) =>
      app
        .get("", user_controller.getUser) // GET /user
        .get("/:id", user_controller.getUserById) // GET /user/:id
        .put("/:id", user_controller.updateUserById) // PUT /user/:id
        .delete("/:id", user_controller.deleteUserById) // DELETE /user/:id
        .post("", user_controller.addUser)
  );
