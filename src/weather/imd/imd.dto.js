
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
    }
};

export const imdPaths = {
    "/api/weather/imd/stations": {
        get: {
            tags: ["IMD Weather"],
            summary: "Get IMD city forecast station mapping",
            description: "Fetch IMD city forecast stations with optional search.",
            parameters: [
                {
                    name: "search",
                    in: "query",
                    required: false,
                    schema: {
                        type: "string",
                        example: "Rourkela"
                    }
                }
            ],
            responses: {
                200: {
                    description: "IMD station mapping fetched successfully."
                },
                502: {
                    description: "Unable to fetch IMD station mapping."
                }
            }
        }
    }
};
