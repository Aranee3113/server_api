import { Elysia } from "elysia";
import { user_route } from "./user.route";
import { auth_route } from "./guard.route";
const r = new Elysia();

r.group("/api", (app) => app.use(user_route).use(auth_route));

export default r;
