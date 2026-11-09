export const cropSchemas = {
    Crop: {
        type: "object",
        properties: {
            id: {
                type: "integer",
                example: 1
            },
            name: {
                type: "string",
                example: "Rice"
            }
        }
    }
};

export const cropPaths = {
    "/api/crop/cropList": {
        get: {
            summary: "Get all crops",
            tags: ["Crop"],
            responses: {
                200: {
                    description: "Crop list fetched successfully"
                },
                500: {
                    description: "Internal server error"
                }
            }
        }
    }
};