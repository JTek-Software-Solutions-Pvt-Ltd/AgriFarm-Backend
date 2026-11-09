import {
    registerUser,
    sendLoginOTP,
    verifyLoginOTP
} from "./auth.service.js";

export const register = async (req, res) => {
    try {
        const {
            mobile,
            email,
            full_name,
            crop_id,
            country,
            district,
            state,
            pincode,
            village
        } = req.body;

        // Mobile is compulsory
        if (!mobile || !mobile.trim()) {
            return res.status(400).json({
                success: false,
                message: "Mobile number is required."
            });
        }

        if (!/^\+[1-9]\d{7,14}$/.test(mobile.trim())) {
            return res.status(400).json({
                success: false,
                message: "Enter mobile number in international format, e.g. +919876543210."
            });
        }

        // Email is optional
        if (
            email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address."
            });
        }

        const result = await registerUser({
            mobile,
            email,
            full_name,
            crop_id,
            country,
            district,
            state,
            pincode,
            village
        });

        if (result.alreadyRegistered) {
            return res.status(200).json({
                success: true,
                alreadyRegistered: true,
                message: "This mobile number is already registered.",
                data: result.user
            });
        }

        return res.status(201).json({
            success: true,
            alreadyRegistered: false,
            message: "User registered successfully.",
            data: result.user
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Email address is already registered."
            });
        }

        if (error.code === "23503") {
            return res.status(400).json({
                success: false,
                message: "Invalid crop ID."
            });
        }

        console.error("Register error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to register user."
        });
    }
};
export const requestOTP = async (req, res, next) => {
    try {
        const { mobile, email } = req.body;

        if (!mobile || !mobile.trim()) {
            return res.status(400).json({
                success: false,
                message: "Mobile number is required."
            });
        }

        const result = await sendLoginOTP({
            mobile,
            email
        });

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully.",
            data: {
                mobile: result.mobile,
                email: result.email
            }
        });

    } catch (error) {
        next(error);
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { mobile, otp } = req.body;

        if (
            !mobile ||
            !/^\+[1-9]\d{7,14}$/.test(mobile.trim()) ||
            !otp ||
            !/^\d{6}$/.test(String(otp))
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid mobile number and six-digit OTP are required."
            });
        }

        const result = await verifyLoginOTP({
            mobile,
            otp: String(otp)
        });

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            data: result
        });

    } catch (error) {
        console.error("OTP verification error:", error.message);

        return res.status(401).json({
            success: false,
            message: error.message || "OTP verification failed."
        });
    }
};