import Elysia from "elysia";
import { auth_controller } from "../controllers/auth.controller";
import { registerSchema } from "../schema/sql.schema";
import { loginSchema } from "../schema/sql.schema";

export const auth_route = (app: Elysia) =>
  app.group("/auth", (app) =>
    app
    .post(
      "/register",
      auth_controller.registeration ,{ body: registerSchema }
    )
    .post("/login",
      auth_controller.login ,{
        body: loginSchema,
      }
    )
  );
