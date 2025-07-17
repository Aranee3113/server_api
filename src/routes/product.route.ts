import { Elysia } from "elysia";
import { product_controller } from "../controllers/product.controller";

export const productRoutes = new Elysia({ prefix: "/product" })
  .get("/", product_controller.getAllProducts)                // GET /api/product
  .get("/:id", product_controller.getProductById)            // GET /api/product/:id
  .post("/", product_controller.createProduct)               // POST /api/product
  .put("/:id", product_controller.updateProductById)         // PUT /api/product/:id
  .delete("/:id", product_controller.deleteProductById);     // DELETE /api/product/:id
