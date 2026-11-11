
const weatherParameters = [
    {
        name: "user_id",
        in: "query",
        required: false,
        schema: {
            type: "integer",
            example: 8
        },
        description: "User ID. Fetches latitude and longitude from the users table."
    },
    {
        name: "latitude",
        in: "query",
        required: false,
        schema: {
            type: "number",
            minimum: -90,
            maximum: 90,
            example: 17.385
        },
        description: "Latitude. Pass together with longitude."
    },
    {
        name: "longitude",
        in: "query",
        required: false,
        schema: {
            type: "number",
            minimum: -180,
            maximum: 180,
            example: 78.4867
        },
        description: "Longitude. Pass together with latitude."
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
        coordinates: {
            type: "object",
            properties: {
                latitude: {
                    type: "number",
                    example: 17.385
                },
                longitude: {
                    type: "number",
                    example: 78.4867
                }
            }
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

    // Current weather
    "/api/weather/current": {
        get: {
            tags: ["Weather"],
            summary: "Get current weather",
            description: "Fetch current weather using user_id or latitude and longitude.",
            parameters: weatherParameters,
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
                    description: "Invalid coordinates or missing parameters"
                },
                404: {
                    description: "User not found"
                },
                502: {
                    description: "Weather provider error"
                }
            }
        }
    },

    // Daily forecast
    "/api/weather/forecast": {
        get: {
            tags: ["Weather"],
            summary: "Get daily weather forecast",
            description: "Fetch daily forecast using user_id or latitude and longitude.",
            parameters: [
                ...weatherParameters,
                {
                    name: "days",
                    in: "query",
                    required: false,
                    schema: {
                        type: "integer",
                        minimum: 1,
                        maximum: 16,
                        default: 7
                    },
                    description: "Number of forecast days."
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
                404: {
                    description: "User not found"
                },
                502: {
                    description: "Weather provider error"
                }
            }
        }
    },

    // Hourly forecast
    "/api/weather/hourly": {
        get: {
            tags: ["Weather"],
            summary: "Get hourly weather forecast",
            description: "Fetch hourly forecast using user_id or latitude and longitude.",
            parameters: weatherParameters,
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
                    description: "Invalid coordinates or missing parameters"
                },
                404: {
                    description: "User not found"
                },
                502: {
                    description: "Weather provider error"
                }
            }
        }
    }

};