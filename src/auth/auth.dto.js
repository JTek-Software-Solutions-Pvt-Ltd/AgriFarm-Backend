export const RegisterDTO = {
    type: "object",
    required: ["mobile"],
    properties: {
        mobile: {
            type: "string",
            example: "+919876543210"
        },
        email: {
            type: "string",
            format: "email",
            nullable: true,
            example: "user@gmail.com"
        },
        full_name: {
            type: "string",
            example: "Ramesh Kumar"
        },
        crop_id: {
            type: "integer",
            nullable: true,
            example: 1
        },
        country: {
            type: "string",
            default: "India",
            example: "India"
        },
        district: {
            type: "string",
            example: "Hyderabad"
        },
        state: {
            type: "string",
            example: "Telangana"
        },
        pincode: {
            type: "string",
            example: "500081"
        },
        village: {
            type: "string",
            example: "Madhapur"
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