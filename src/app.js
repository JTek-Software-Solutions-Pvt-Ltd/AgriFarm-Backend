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

// 404 handler - keep this last
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

export default app;
