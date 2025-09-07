import { Elysia } from "elysia";
import { user_route } from "./user.route";
import { auth_route } from "./guard.route";
import { productRoutes } from "./product.route";
import { postRoutes } from "./post.route";
import { commentRoutes } from "./comment.route";
import { ratingRoute } from "./rating.route";
import { textileRatingRoute } from "./textile-rating.route";

const r = new Elysia();

r.group("/api", (app) =>
  app.use(user_route)
     .use(auth_route)
     .use(productRoutes)
     .use(postRoutes)
     .use(commentRoutes)
     .use(ratingRoute)
     .use(textileRatingRoute)
);

export default r;
