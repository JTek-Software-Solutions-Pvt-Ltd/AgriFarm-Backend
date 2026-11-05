import crypto from "crypto";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { sendOTPEmail } from "../utils/email.js";

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 5);
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS || 60);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);

const normalizeMobile = (mobile) => mobile.trim();

const hashOTP = (otp) => {
    return crypto
        .createHmac("sha256", process.env.OTP_SECRET)
        .update(otp)
        .digest("hex");
};

const generateOTP = () => {
    return crypto.randomInt(100000, 1000000).toString();
};

const createToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            mobile: user.mobile
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "15m",
            issuer: "kissandost-api",
            audience: "kissandost-client"
        }
    );
};

// REGISTER USER
export const registerUser = async ({ mobile, email }) => {
    const normalizedMobile = normalizeMobile(mobile);
    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
        `INSERT INTO users (mobile, email)
         VALUES ($1, $2)
         RETURNING id, mobile, email, created_at`,
        [normalizedMobile, normalizedEmail]
    );

    return result.rows[0];
};

// SEND OTP TO REGISTERED EMAIL

const FALLBACK_EMAIL =
    process.env.OTP_FALLBACK_EMAIL || "teamjtek@gmail.com";

// SEND OTP AND AUTO-REGISTER MOBILE IF NEW
export const sendLoginOTP = async ({ mobile, email }) => {

    if (!mobile || !mobile.trim()) {
        const error = new Error("Mobile number is required.");
        error.statusCode = 400;
        throw error;
    }

    const normalizedMobile = normalizeMobile(mobile);
    const normalizedEmail = email?.trim().toLowerCase() || null;

    // Check whether mobile already exists
    let userResult = await pool.query(
        `SELECT id, mobile, email
         FROM users
         WHERE mobile = $1`,
        [normalizedMobile]
    );

    let user;

    if (userResult.rows.length === 0) {

        // Automatically register new mobile number
        const registrationResult = await pool.query(
            `INSERT INTO users (mobile, email)
             VALUES ($1, $2)
             ON CONFLICT (mobile) DO NOTHING
             RETURNING id, mobile, email`,
            [normalizedMobile, normalizedEmail || FALLBACK_EMAIL]
        );

        if (registrationResult.rows.length) {
            user = registrationResult.rows[0];
        } else {
            // Another request may have registered this mobile simultaneously
            userResult = await pool.query(
                `SELECT id, mobile, email
                 FROM users
                 WHERE mobile = $1`,
                [normalizedMobile]
            );
            user = userResult.rows[0];
        }

    } else {
        user = userResult.rows[0];
    }

    if (!user || user.is_active === false) {
        throw new Error("Unable to process this mobile number.");
    }

    // IMPORTANT:
    // Existing users receive OTP at their already registered email.
    // Do not allow a login request to change their registered email.
    const destinationEmail = user.email || FALLBACK_EMAIL;

    // Check resend cooldown
    const latestOTP = await pool.query(
        `SELECT last_sent_at
         FROM login_otps
         WHERE user_id = $1
           AND used_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [user.id]
    );

    if (latestOTP.rows.length) {
        const elapsedSeconds =
            (Date.now() -
                new Date(latestOTP.rows[0].last_sent_at).getTime()) / 1000;

        if (elapsedSeconds < OTP_RESEND_SECONDS) {
            const error = new Error(
                "Please wait before requesting another OTP."
            );
            error.statusCode = 429;
            throw error;
        }
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    await pool.query(
        `UPDATE login_otps
         SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
    );

    await pool.query(
        `INSERT INTO login_otps
         (user_id, otp_hash, expires_at, last_sent_at)
         VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'), NOW())`,
        [user.id, otpHash, OTP_EXPIRY_MINUTES]
    );

    try {
        await sendOTPEmail(destinationEmail, otp);
    } catch (error) {
        await pool.query(
            `UPDATE login_otps
             SET used_at = NOW()
             WHERE user_id = $1
               AND otp_hash = $2
               AND used_at IS NULL`,
            [user.id, otpHash]
        );

        throw new Error("Unable to send OTP email. Please try again.");
    }

    return {
        mobile: user.mobile,
        email: destinationEmail
    };
};


// VERIFY OTP AND GENERATE JWT
export const verifyLoginOTP = async ({ mobile, otp }) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const userResult = await client.query(
            `SELECT id, mobile, email
             FROM users
             WHERE mobile = $1 AND is_active = TRUE`,
            [normalizeMobile(mobile)]
        );

        if (!userResult.rows.length) {
            throw new Error("Invalid mobile number or OTP.");
        }

        const user = userResult.rows[0];

        const otpResult = await client.query(
            `SELECT id, otp_hash, expires_at, attempts
             FROM login_otps
             WHERE user_id = $1
               AND used_at IS NULL
             ORDER BY created_at DESC
             LIMIT 1
             FOR UPDATE`,
            [user.id]
        );

        if (!otpResult.rows.length) {
            throw new Error("OTP not found. Please request a new OTP.");
        }

        const otpRecord = otpResult.rows[0];

        if (new Date(otpRecord.expires_at).getTime() <= Date.now()) {
            await client.query(
                `UPDATE login_otps SET used_at = NOW() WHERE id = $1`,
                [otpRecord.id]
            );

            throw new Error("OTP expired. Please request a new OTP.");
        }

        if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
            throw new Error("Maximum OTP attempts reached. Request a new OTP.");
        }

        const submittedHash = hashOTP(otp);

        if (
            !crypto.timingSafeEqual(
                Buffer.from(submittedHash, "hex"),
                Buffer.from(otpRecord.otp_hash, "hex")
            )
        ) {
            await client.query(
                `UPDATE login_otps
                 SET attempts = attempts + 1,
                     used_at = CASE
                         WHEN attempts + 1 >= $2 THEN NOW()
                         ELSE used_at
                     END
                 WHERE id = $1`,
                [otpRecord.id, OTP_MAX_ATTEMPTS]
            );

            throw new Error("Invalid mobile number or OTP.");
        }

        await client.query(
            `UPDATE login_otps SET used_at = NOW() WHERE id = $1`,
            [otpRecord.id]
        );

        await client.query("COMMIT");

        const token = createToken(user);

        return {
            token,
            user: {
                id: user.id,
                mobile: user.mobile,
                email: user.email
            }
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};