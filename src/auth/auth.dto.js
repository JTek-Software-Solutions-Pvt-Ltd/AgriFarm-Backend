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
        },
        latitude: {
            type: "number",
            nullable: true,
            minimum: -90,
            maximum: 90,
            example: 17.385
        },
        longitude: {
            type: "number",
            nullable: true,
            minimum: -180,
            maximum: 180,
            example: 78.4867
        }
    }
};
export const UserProfileResponse = {
    type: "object",
    properties: {
        success: {
            type: "boolean",
            example: true
        },
        message: {
            type: "string",
            example: "User profile fetched successfully."
        },
        data: {
            type: "object",
            properties: {
                user_id: {
                    type: "integer",
                    example: 8
                },
                full_name: {
                    type: "string",
                    example: "Ramesh Kumar",
                    nullable: true
                },
                photo_url: {
                    type: "string",
                    example: "https://example.com/profile/user8.jpg",
                    nullable: true
                },
                email: {
                    type: "string",
                    example: "ramesh@gmail.com",
                    nullable: true
                },
                phone: {
                    type: "string",
                    example: "+919876543210"
                },
                crop_id: {
                    type: "integer",
                    example: 1,
                    nullable: true
                },
                primary_crop: {
                    type: "string",
                    example: "Rice",
                    nullable: true
                },
                country: {
                    type: "string",
                    example: "India"
                },
                state: {
                    type: "string",
                    example: "Telangana",
                    nullable: true
                },
                
                district: {
                    type: "string",
                    example: "Hyderabad",
                    nullable: true
                },
                pincode: {
                    type: "string",
                    example: "500081",
                    nullable: true
                },
                latitude: {
                    type: "number",
                    nullable: true,
                    minimum: -90,
                    maximum: 90,
                    example: 17.385
                },
                longitude: {
                    type: "number",
                    nullable: true,
                    minimum: -180,
                    maximum: 180,
                    example: 78.4867
                }
            }
        }
    }
};

export const UpdateProfileDTO = {
    type: "object",
    properties: {
        full_name: {
            type: "string",
            example: "Ramesh Kumar"
        },
        photo_url: {
            type: "string",
            nullable: true,
            example: "https://example.com/profile.jpg"
        },
        email: {
            type: "string",
            format: "email",
            example: "ramesh@gmail.com"
        },
        mobile: {
            type: "string",
            example: "+919876543210"
        },
        crop_id: {
            type: "integer",
            example: 1
        },
        country: {
            type: "string",
            example: "India"
        },
        state: {
            type: "string",
            example: "Odisha"
        },
        district: {
            type: "string",
            example: "Cuttack"
        },
        pincode: {
            type: "string",
            example: "500081"
        },
        latitude: {
            type: "number",
            nullable: true,
            minimum: -90,
            maximum: 90,
            example: 17.385
        },
        longitude: {
            type: "number",
            nullable: true,
            minimum: -180,
            maximum: 180,
            example: 78.4867
        }
    },
    minProperties: 1
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
    AuthResponseDTO,
    UserProfileResponse,
    UpdateProfileDTO
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
    },

     "/api/auth/profile/{user_id}": {
        get: {
            tags: ["Authentication"],
            summary: "Get User Profile",
            description: "Fetch user profile details using user ID.",
            parameters: [
                {
                    name: "user_id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "integer",
                        example: 8
                    }
                }
            ],
            responses: {
                200: {
                    description: "User profile fetched successfully",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/UserProfileResponse"
                            }
                        }
                    }
                },
                400: { description: "Invalid user ID" },
                404: { description: "User not found" },
                500: { description: "Internal server error" }
            }
        }
    },
     "/api/auth/updateProfile/{user_id}": {
        put: {
            tags: ["Authentication"],
            summary: "Update User Profile",
            description: "Update user profile details using user ID.",
            parameters: [
                {
                    name: "user_id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "integer",
                        example: 8
                    }
                }
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/UpdateProfileDTO"
                        }
                    }
                }
            },
            responses: {
                200: {
                    description: "User profile updated successfully"
                },
                400: {
                    description: "Invalid request"
                },
                404: {
                    description: "User not found"
                },
                500: {
                    description: "Internal server error"
                }
            }
        }
    }
};