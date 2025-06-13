import Elysia from "elysia";
import { user_controller } from "../controllers/user.controller";

export const user_route = (app: Elysia) =>
  app.group("/user", (app) =>
    app
      .get("", user_controller.getUser)
      .get("/:id", user_controller.getUserById)
  );
