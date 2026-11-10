const coordinateParameters = [
    {
        name: "latitude",
        in: "query",
        required: true,
        schema: {
            type: "number",
            minimum: -90,
            maximum: 90,
            example: 17.385
        }
    },
    {
        name: "longitude",
        in: "query",
        required: true,
        schema: {
            type: "number",
            minimum: -180,
            maximum: 180,
            example: 78.4867
        }
    }
];

const weatherResponse = {
    type: "object",
    properties: {
        success: {
            type: "boolean",
            example: true
        },
        message: {
            type: "string",
            example: "Weather fetched successfully."
        },
        data: {
            type: "object",
            description: "Weather information returned by Open-Meteo."
        }
    }
};

export const weatherSchemas = {
    WeatherResponse: weatherResponse
};

export const weatherPaths = {

    "/api/weather/current": {
        get: {
            tags: ["Weather"],
            summary: "Get current weather",
            parameters: coordinateParameters,
            responses: {
                200: {
                    description: "Current weather fetched successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/WeatherResponse"
                            }
                        }
                    }
                },
                400: {
                    description: "Invalid coordinates"
                },
                502: {
                    description: "Weather provider error"
                }
            }
        }
    },

    "/api/weather/forecast": {
        get: {
            tags: ["Weather"],
            summary: "Get daily weather forecast",
            parameters: [
                ...coordinateParameters,
                {
                    name: "days",
                    in: "query",
                    required: false,
                    schema: {
                        type: "integer",
                        minimum: 1,
                        maximum: 16,
                        default: 7
                    }
                }
            ],
            responses: {
                200: {
                    description: "Weather forecast fetched successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/WeatherResponse"
                            }
                        }
                    }
                },
                400: {
                    description: "Invalid coordinates or forecast days"
                },
                502: {
                    description: "Weather provider error"
                }
            }
        }
    },

    "/api/weather/hourly": {
        get: {
            tags: ["Weather"],
            summary: "Get hourly weather forecast",
            parameters: coordinateParameters,
            responses: {
                200: {
                    description: "Hourly weather fetched successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/WeatherResponse"
                            }
                        }
                    }
                },
                400: {
                    description: "Invalid coordinates"
                },
                502: {
                    description: "Weather provider error"
                }
            }
        }
    }

};