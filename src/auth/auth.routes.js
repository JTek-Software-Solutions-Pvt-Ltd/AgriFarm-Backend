import express from "express";

import {
    register,
    requestOTP,
    verifyOTP,userProfile,updateProfile
} from "./auth.controller.js";

const router = express.Router();

// Module-level endpoint
router.get("/", (req, res) => {
    res.json({
        success: true,
        module: "Authentication",
        status: "Active"
    });
});

// Authentication endpoints
router.post("/register", register);
router.post("/send-otp", requestOTP);
router.post("/verify-otp", verifyOTP);
router.get("/profile/:user_id", userProfile);
router.put("/updateProfile/:user_id", updateProfile);

export default router;