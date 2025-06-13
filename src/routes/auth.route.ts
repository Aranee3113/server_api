import Elysia from "elysia";
import { auth_controller } from "../controllers/auth.controller";
import { registerSchema } from "../schema/sql.schema";
export const auth_route = (app: Elysia) =>
  app.group("/auth", (app) =>
    app.post(
      "",
      auth_controller.register({
        body: registerSchema,
      })
    )
  );
