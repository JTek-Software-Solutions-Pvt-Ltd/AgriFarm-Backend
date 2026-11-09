import { authSchemas, authPaths } from "../auth/auth.dto.js";
import { cropSchemas, cropPaths } from "../crop/crop.dto.js";


const swaggerSpec = {

    openapi: "3.0.3",

    info: {
        title: "AgriFarm Backend API",
        version: "1.0.0",
        description: "AgriFarm API Documentation"
    },

    servers: [
        {
            //url: "http://20.12.240.74:7000"
            url: process.env.BACKEND_URL
        }
    ],

    tags: [
        {
            name: "Authentication",
            description: "Authentication APIs"
        }
    ],

    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT"
            }
        },

        schemas: {
            ...authSchemas,
            ...cropSchemas
        }
    },

    paths: {
        ...authPaths,
        ...cropPaths
    }
};

console.log("Swagger registered endpoints:", Object.keys(swaggerSpec.paths));

export default swaggerSpec;
