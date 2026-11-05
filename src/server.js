import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import pool from "./config/db.js";
import { verifyEmailConnection } from "./utils/email.js";

const PORT = process.env.PORT || 7000;

const startServer = async () => {
    try {
        await pool.query("SELECT 1");
        console.log("PostgreSQL connected successfully.");

        await verifyEmailConnection();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
};

startServer();