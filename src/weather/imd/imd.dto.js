
export const imdSchemas = {
    ImdStation: {
        type: "object",
        properties: {
            Station_Code: {
                type: "string",
                example: "IMD_STATION_CODE"
            },
            Station_Name: {
                type: "string",
                example: "ROURKELA"
            }
        }
    },

    ImdApiResponse: {
        type: "object",
        properties: {
            success: {
                type: "boolean",
                example: true
            },
            message: {
                type: "string",
                example: "IMD data fetched successfully."
            },
            provider: {
                type: "string",
                example: "IMD"
            },
            data: {
                type: "object",
                additionalProperties: true
            }
        }
    }
};

const stationIdParameter = {
    name: "station_id",
    in: "query",
    required: true,
    schema: {
        type: "string",
        example: "42182"
    }
};

const districtIdParameter = {
    name: "district_id",
    in: "query",
    required: true,
    schema: {
        type: "string",
        example: "1"
    }
};

const imdResponses = {
    200: {
        description: "IMD data fetched successfully."
    },
    400: {
        description: "Required query parameter is missing."
    },
    502: {
        description: "Unable to fetch data from IMD."
    },
    504: {
        description: "IMD API request timed out."
    }
};

export const imdPaths = {

    // 1. Current Weather
    "/api/weather/imd/current": {
        get: {
            tags: ["IMD Weather"],
            summary: "Get IMD current weather",
            parameters: [stationIdParameter],
            responses: imdResponses
        }
    },

    // 2. City Forecast
    "/api/weather/imd/forecast": {
        get: {
            tags: ["IMD Weather"],
            summary: "Get IMD city forecast",
            parameters: [stationIdParameter],
            responses: imdResponses
        }
    },

    // 3. District Warning
    "/api/weather/imd/warnings": {
        get: {
            tags: ["IMD Weather"],
            summary: "Get IMD district warnings",
            parameters: [districtIdParameter],
            responses: imdResponses
        }
    },

    // 4. District Nowcast
    "/api/weather/imd/nowcast": {
        get: {
            tags: ["IMD Weather"],
            summary: "Get IMD district nowcast",
            parameters: [districtIdParameter],
            responses: imdResponses
        }
    },

    // 5. District Rainfall
    "/api/weather/imd/rainfall": {
        get: {
            tags: ["IMD Weather"],
            summary: "Get IMD district rainfall",
            parameters: [districtIdParameter],
            responses: imdResponses
        }
    },

    // 6. AWS Data
    "/api/weather/imd/aws": {
        get: {
            tags: ["IMD Weather"],
            summary: "Get IMD AWS weather data",
            parameters: [
                {
                    name: "station_id",
                    in: "query",
                    required: false,
                    schema: {
                        type: "string",
                        example: "NDL"
                    }
                },
                {
                    name: "state_id",
                    in: "query",
                    required: false,
                    schema: {
                        type: "string",
                        example: "10"
                    }
                }
            ],
            responses: imdResponses
        }
    },

    // 7. Station Mapping
    
    "/api/weather/imd/stations": {
        get: {
            tags: ["IMD Weather"],
            summary: "Get nearest IMD weather station",
            description: "Find the nearest IMD city forecast station using farmer latitude and longitude.",
            security: [
                {
                    bearerAuth: []
                }
            ],
            parameters: [
                {
                    name: "latitude",
                    in: "query",
                    required: true,
                    schema: {
                        type: "number",
                        minimum: -90,
                        maximum: 90,
                        example: 19.8135
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
                        example: 85.8312
                    }
                }
            ],
            responses: {
                200: {
                    description: "Nearest IMD station fetched successfully."
                },
                400: {
                    description: "Invalid or missing coordinates."
                },
                404: {
                    description: "No valid IMD stations found."
                },
                502: {
                    description: "Unable to fetch IMD station mapping."
                }
            }
        }
    }

};
