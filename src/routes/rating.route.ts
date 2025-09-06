import { Elysia } from "elysia";
import { ratingController } from "../controllers/rating.controller";

export const ratingRoute = (app: Elysia) =>
  app.group("/rating", (app) =>
    app
      .post("/:id", ratingController.ratePost)
      .delete("/:id", ratingController.deleteMyRating)
      .get("/:id/me", ratingController.getMyRating)
      .get("/:id/summary", ratingController.getRatingSummary)
  );
