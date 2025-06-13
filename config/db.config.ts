import { password } from "bun";
import dotenv from "dotenv";
dotenv.config();

export const config = {
    db: {
        host:process.env.DB_HOST,
        port:process.env.DB_PORT,
        user:process.env.DB_USER,
        database:process.env.DB_NAME,
        password:process.env.DB_PASS,
    },
    apiKey: process.env.API_KEY ,
}