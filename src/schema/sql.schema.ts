import { t } from "elysia";

export const registerSchema = t.Object({
  user_name: t.String(),
  user_username: t.String(),
  user_password: t.String(),
});
export const loginSchema = t.Object({
  user_username: t.String(),
  user_password: t.String(),
});
