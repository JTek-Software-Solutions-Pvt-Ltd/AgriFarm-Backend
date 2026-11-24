
import { authSchemas, authPaths } from "../auth/auth.dto.js";
import { cropSchemas, cropPaths } from "../crop/crop.dto.js";

import {
    weatherSchemas,
    weatherPaths
} from "../weather/weather.dto.js";

import {
    imdSchemas,
    imdPaths
} from "../weather/imd/imd.dto.js";

const swaggerSpec = {
    openapi: "3.0.3",

    info: {
        title: "AgriFarm Backend API",
        version: "1.0.0",
        description: "AgriFarm API Documentation"
    },

    servers: [
        {
            url: process.env.BACKEND_URL
        }
    ],

    security: [
        {
            bearerAuth: []
        }
    ],

    tags: [
        {
            name: "Authentication",
            description: "Authentication APIs"
        },
        {
            name: "IMD Weather",
            description: "India Meteorological Department Weather APIs"
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
            ...cropSchemas,
            ...weatherSchemas,
            ...imdSchemas
        }
    },

    paths: {
        ...authPaths,
        ...cropPaths,
        ...weatherPaths,
        ...imdPaths
    }
};

console.log(
    "Swagger registered endpoints:",
    Object.keys(swaggerSpec.paths)
);

export default swaggerSpec;