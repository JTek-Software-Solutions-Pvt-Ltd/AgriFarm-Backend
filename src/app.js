import express from "express";
import cors from "cors";
import helmet from "helmet";

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

import { registerRoutes } from "./routes/index.js";

const app = express();

app.use(
    helmet({
        hsts: false,
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                "upgrade-insecure-requests": null
            }
        }
    })
);

app.use(cors());
app.use(express.json());

// Swagger documentation
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

// Application routes
registerRoutes(app);

// 404 handler - keep this before global error handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

// GLOBAL ERROR HANDLER
// Global error handler
app.use((err, req, res, next) => {

    const statusCode = err.statusCode || 500;

    // Log only unexpected server errors
    if (statusCode >= 500) {
        console.error("Server Error:", err);
    }

    return res.status(statusCode).json({
        success: false,
        statusCode,
        message: err.message || "Internal server error."
    });
});

export default app;