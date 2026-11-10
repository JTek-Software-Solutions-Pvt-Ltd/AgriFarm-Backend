import crypto from "crypto";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { sendOTPEmail } from "../utils/email.js";

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 5);
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS || 60);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
// SEND OTP TO REGISTERED EMAIL

const FALLBACK_EMAIL =
    process.env.OTP_FALLBACK_EMAIL || "teamjtek@gmail.com";

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
export const registerUser = async ({
    mobile,
    email,
    full_name,
    crop_id,
    country,
    district,
    state,
    pincode,
    village
}) => {

    const normalizedMobile = normalizeMobile(mobile);
    const normalizedEmail = email?.trim().toLowerCase() || FALLBACK_EMAIL;

    // 1. Try to insert a new user
    const result = await pool.query(
        `INSERT INTO users (
            mobile,
            email,
            full_name,
            crop_id,
            country,
            district,
            state,
            pincode,
            village,
            is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)
        ON CONFLICT (mobile) DO NOTHING
        RETURNING
            id, mobile, email, full_name, crop_id,
            country, district, state, pincode, village,
            is_active, created_at`,
        [
            normalizedMobile,
            normalizedEmail,
            full_name?.trim() || null,
            crop_id || null,
            country?.trim() || "India",
            district?.trim() || null,
            state?.trim() || null,
            pincode?.trim() || null,
            village?.trim() || null
        ]
    );

    let user;
    let isNewUser = false;

    // 2. Newly created user
    if (result.rows.length > 0) {
        user = result.rows[0];
        isNewUser = true;
    } else {

        // 3. Mobile already exists: fetch existing user
        const existingUser = await pool.query(
            `SELECT
                id, mobile, email, full_name, crop_id,
                country, district, state, pincode, village,
                is_active, created_at
             FROM users
             WHERE mobile = $1`,
            [normalizedMobile]
        );

        if (existingUser.rows.length === 0) {
            throw new Error("Unable to register user.");
        }

        user = existingUser.rows[0];

        // 4. Already verified user
        if (user.is_active) {
            return {
                user,
                alreadyRegistered: true,
                pendingVerification: false
            };
        }
    }

    // 5. Generate OTP for new or pending-verification user
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // Send email only if email is available
    if (user.email) {
        await sendOTPEmail(user.email, otp);
    }

    // 6. Insert OTP using the correct user ID
    await pool.query(
        `INSERT INTO login_otps (
            user_id,
            otp_hash,
            expires_at,
            last_sent_at
        )
        VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'), NOW())`,
        [
            user.id,
            otpHash,
            OTP_EXPIRY_MINUTES
        ]
    );

    return {
        user,
        alreadyRegistered: false,
        pendingVerification: true,
        isNewUser
    };
};



// SEND OTP AND AUTO-REGISTER MOBILE IF NEW
export const sendLoginOTP = async ({ mobile, email }) => {

    if (!mobile || !mobile.trim()) {
        const error = new Error("Mobile number is required.");
        error.statusCode = 400;
        throw error;
    }

    const normalizedMobile = normalizeMobile(mobile);

    // 1. Check whether mobile exists
    const userResult = await pool.query(
        `SELECT id, mobile, email, is_active
         FROM users
         WHERE mobile = $1`,
        [normalizedMobile]
    );

    // 2. Mobile number does not exist
    if (userResult.rows.length === 0) {
        const error = new Error(
            "Mobile number is not registered. Please register first."
        );
        error.statusCode = 404;
        throw error;
    }

    const user = userResult.rows[0];

    // 3. Check account verification
    if (!user.is_active) {
        const error = new Error(
            "Your account is not verified. Please complete registration first."
        );
        error.statusCode = 403;
        throw error;
    }

    // 4. Use registered email only
    const destinationEmail = user.email || FALLBACK_EMAIL;

    // 5. Check OTP resend cooldown
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

    // 6. Generate OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // 7. Invalidate previous OTPs
    await pool.query(
        `UPDATE login_otps
         SET used_at = NOW()
         WHERE user_id = $1
           AND used_at IS NULL`,
        [user.id]
    );

    // 8. Insert new OTP
    const otpResult = await pool.query(
        `INSERT INTO login_otps (
            user_id,
            otp_hash,
            expires_at,
            last_sent_at
        )
        VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'), NOW())
        RETURNING id`,
        [user.id, otpHash, OTP_EXPIRY_MINUTES]
    );

    try {
        // 9. Send OTP email
        await sendOTPEmail(destinationEmail, otp);

    } catch (error) {

        // Invalidate OTP if email sending fails
        await pool.query(
            `UPDATE login_otps
             SET used_at = NOW()
             WHERE id = $1`,
            [otpResult.rows[0].id]
        );

        const emailError = new Error(
            "Unable to send OTP email. Please try again."
        );
        emailError.statusCode = 500;
        throw emailError;
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

        // Find user whether active or inactive
        const userResult = await client.query(
            `SELECT id, mobile, email, is_active
             FROM users
             WHERE mobile = $1`,
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
                `UPDATE login_otps
                 SET used_at = NOW()
                 WHERE id = $1`,
                [otpRecord.id]
            );

            throw new Error("OTP expired. Please request a new OTP.");
        }

        if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
            throw new Error(
                "Maximum OTP attempts reached. Request a new OTP."
            );
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

            // Commit attempt count before returning the error
            await client.query("COMMIT");

            throw new Error("Invalid mobile number or OTP.");
        }

        // Mark OTP as verified/used
        await client.query(
            `UPDATE login_otps
             SET used_at = NOW()
             WHERE id = $1`,
            [otpRecord.id]
        );

        // Activate user only after successful OTP verification
        await client.query(
            `UPDATE users
             SET is_active = TRUE,
                 updated_at = NOW()
             WHERE id = $1`,
            [user.id]
        );

        await client.query("COMMIT");

        const token = createToken(user);

        return {
            token,
            user: {
                id: user.id,
                mobile: user.mobile,
                email: user.email,
                is_active: true
            }
        };

    } catch (error) {

        // Rollback only if transaction is still open
        await client.query("ROLLBACK").catch(() => {});

        throw error;

    } finally {
        client.release();
    }
};