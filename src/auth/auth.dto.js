export const RegisterDTO = {
    type: "object",
    required: ["mobile", "email"],
    properties: {
        mobile: {
            type: "string",
            example: "9876543210"
        },
        email: {
            type: "string",
            format: "email",
            example: "user@gmail.com"
        }
    }
};

export const SendOTPDTO = {
    type: "object",
    required: ["mobile"],
    properties: {
        mobile: {
            type: "string",
            example: "9876543210"
        },
        email: {
            type: "string",
            format: "email",
            example: "user@gmail.com",
            description: "Optional email address used when creating a new user."
        }
    }
};

export const VerifyOTPDTO = {
    type: "object",
    required: ["mobile", "otp"],
    properties: {
        mobile: {
            type: "string",
            example: "9876543210"
        },
        otp: {
            type: "string",
            example: "123456"
        }
    }
};

export const AuthResponseDTO = {
    type: "object",
    properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "OTP verified successfully" },
        token: { type: "string", example: "JWT_TOKEN" }
    }
};

export const authSchemas = {
    RegisterDTO,
    SendOTPDTO,
    VerifyOTPDTO,
    AuthResponseDTO
};

// API DOCUMENTATION

export const authPaths = {

    "/api/auth": {
        get: {
            tags: ["Authentication"],
            summary: "Check authentication module status",
            responses: {
                200: {
                    description: "Authentication module active"
                }
            }
        }
    },

    "/api/auth/register": {
        post: {
            tags: ["Authentication"],
            summary: "Register user",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/RegisterDTO"
                        }
                    }
                }
            },
            responses: {
                201: {
                    description: "User registered successfully"
                },
                400: {
                    description: "Invalid request"
                }
            }
        }
    },

    "/api/auth/send-otp": {
        post: {
            tags: ["Authentication"],
            summary: "Send login OTP",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/SendOTPDTO"
                        }
                    }
                }
            },
            responses: {
                200: {
                    description: "OTP request processed"
                }
            }
        }
    },

    "/api/auth/verify-otp": {
        post: {
            tags: ["Authentication"],
            summary: "Verify login OTP",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/VerifyOTPDTO"
                        }
                    }
                }
            },
            responses: {
                200: {
                    description: "OTP verification result",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/AuthResponseDTO"
                            }
                        }
                    }
                }
            }
        }
    }
};