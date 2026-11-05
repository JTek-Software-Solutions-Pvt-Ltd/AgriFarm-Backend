import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export const sendOTPEmail = async (email, otp) => {
    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: "Your login verification code",
        text: `Your login OTP is ${otp}. It expires in ${process.env.OTP_EXPIRY_MINUTES || 5} minutes. Do not share this code with anyone.`,
        html: `
            <div style="font-family:Arial,sans-serif">
                <h2>Login Verification</h2>
                <p>Your verification code is:</p>
                <h1 style="letter-spacing:5px">${otp}</h1>
                <p>This code expires in ${process.env.OTP_EXPIRY_MINUTES || 5} minutes.</p>
                <p>Do not share this code with anyone.</p>
            </div>
        `
    });
};

export const verifyEmailConnection = async () => {
    await transporter.verify();
    console.log("SMTP connection successful");
};