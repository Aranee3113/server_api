import Elysia from "elysia";
import { user_controller } from "../controllers/user.controller";
import { authRole } from "../utils/authRole";

export const user_route = (app: Elysia) =>
  app.group("/user", (app) =>
    app
      // 🔒 Admin เท่านั้นที่ดูรายชื่อผู้ใช้ทั้งหมดได้
      .use(authRole("admin"))
      .get("", user_controller.getUser)

      // 🧍 Member (0) หรือ Admin (1) ดู/แก้ไขข้อมูลของตัวเองได้
      .use(authRole("member"))
      .get("/:id", user_controller.getUserById)
      .put("/:id", user_controller.updateUserById)

      // 🔒 ลบ user ได้เฉพาะ Admin
      .use(authRole("admin"))
      .delete("/:id", user_controller.deleteUserById)

      // 🆕 สมัครสมาชิก (ไม่ต้องใช้ token)
      .post("", user_controller.addUser)
  );
