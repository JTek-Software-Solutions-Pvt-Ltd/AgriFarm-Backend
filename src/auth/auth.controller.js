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
            village,
            latitude,
            longitude
        } = req.body;

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

        if (
            email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address."
            });
        }

        // Validate latitude and longitude
        if (
            latitude !== undefined &&
            (!Number.isFinite(Number(latitude)) ||
                Number(latitude) < -90 ||
                Number(latitude) > 90)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid latitude. Must be between -90 and 90."
            });
        }

        if (
            longitude !== undefined &&
            (!Number.isFinite(Number(longitude)) ||
                Number(longitude) < -180 ||
                Number(longitude) > 180)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid longitude. Must be between -180 and 180."
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
            village,
            latitude,
            longitude
        });

        if (result.alreadyRegistered) {
            return res.status(409).json({
                success: false,
                alreadyRegistered: true,
                message: "This mobile number is already registered.",
                data: result.user
            });
        }

        return res.status(201).json({
            success: true,
            alreadyRegistered: false,
            pendingVerification: true,
            message: "Registration initiated. Please verify your OTP.",
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