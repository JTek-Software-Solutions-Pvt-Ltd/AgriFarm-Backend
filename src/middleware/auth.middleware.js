import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
    console.log("AUTH MIDDLEWARE HIT");

    const authHeader = req.headers.authorization;

    console.log(
        "Authorization header present:",
        Boolean(authHeader)
    );

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("JWT missing or invalid");

        return res.status(401).json({
            success: false,
            message: "Access token is required."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        console.log("JWT verified. User ID:", decoded.userId);

        next();

    } catch (error) {
        console.error(
            "JWT verification failed:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
};