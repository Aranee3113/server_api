import { Elysia } from "elysia";
import { textileRatingController } from "../controllers/textile-rating.controller";

export const textileRatingRoute = (app: Elysia) =>
  app.group("/textile-rating", (app) =>
    app
      .post("/:id", textileRatingController.rate)           
      .delete("/:id", textileRatingController.deleteMine)   
      .get("/:id/summary", textileRatingController.summary) 
  );
