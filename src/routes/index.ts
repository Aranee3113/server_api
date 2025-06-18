import { Elysia } from "elysia";
import { user_route } from "./user.route";
import { auth_route } from "./guard.route";
import { productRoutes } from "./product.route";

const r = new Elysia();

r.group("/api", (app) =>
  app.use(user_route)
     .use(auth_route)
     .use(productRoutes)
);

export default r;
