import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { cookie } from "@elysiajs/cookie";
import staticPlugin from "@elysiajs/static";
import r from "./routes";

const app = new Elysia()
  .use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  )
  .use(cookie())
  .use(
    staticPlugin({
      prefix: "/",
      assets: "./public",
    })
  )
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET as string }))
  .use(r)
  .listen(8008);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
