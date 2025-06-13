import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { cookie } from "@elysiajs/cookie";
import staicPlugin from "@elysiajs/static";
import r from "./routes";

const app = new Elysia()
  .use(cookie())
  .use(
    staicPlugin({
      prefix: "/",
      assets: "./public",
    })
  )
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET }))
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      cedentials: true,
    })
  )
  .use(r)
  app.listen(8008)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
