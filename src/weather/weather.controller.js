import {
    getCurrentWeather,
    getWeatherForecast,
    getHourlyWeather,
    getUserCoordinates
} from "./weather.service.js";

// Resolve coordinates from request or user table testdata check
const resolveCoordinates = async (query) => {

    const { latitude, longitude, user_id } = query;

    // If either coordinate is supplied, require both
    if (latitude !== undefined || longitude !== undefined) {

        const validationError = validateCoordinates(
            latitude,
            longitude
        );

        if (validationError) {
            const error = new Error(validationError);
            error.statusCode = 400;
            throw error;
        }

        return {
            latitude: Number(latitude),
            longitude: Number(longitude)
        };
    }

    // Otherwise get coordinates using user ID
    if (!user_id || !/^[1-9]\d*$/.test(String(user_id))) {
        const error = new Error(
            "Please provide valid user_id or latitude and longitude."
        );
        error.statusCode = 400;
        throw error;
    }

    return await getUserCoordinates(Number(user_id));
};

// Validate coordinates
const validateCoordinates = (latitude, longitude) => {

    if (
        latitude === undefined ||
        longitude === undefined ||
        latitude === "" ||
        longitude === ""
    ) {
        return "Latitude and longitude are required.";
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
    ) {
        return "Please provide valid latitude and longitude.";
    }

    return null;
};

// Current weather Fetching
export const currentWeather = async (req, res, next) => {
    try {

        const coordinates = await resolveCoordinates(req.query);

        const data = await getCurrentWeather(coordinates);

        return res.status(200).json({
            success: true,
            message: "Current weather fetched successfully.",
            coordinates,
            data
        });

    } catch (error) {
        next(error);
    }
};

// Daily forecast Fetching
export const weatherForecast = async (req, res, next) => {
    try {

        const { days = 7 } = req.query;

        const forecastDays = Number(days);

        if (
            !Number.isInteger(forecastDays) ||
            forecastDays < 1 ||
            forecastDays > 16
        ) {
            const error = new Error(
                "Days must be an integer between 1 and 16."
            );
            error.statusCode = 400;
            throw error;
        }

        const coordinates = await resolveCoordinates(req.query);

        const data = await getWeatherForecast({
            ...coordinates,
            days: forecastDays
        });

        return res.status(200).json({
            success: true,
            message: "Weather forecast fetched successfully.",
            coordinates,
            data
        });

    } catch (error) {
        next(error);
    }
};

// Hourly forecast
export const hourlyWeather = async (req, res, next) => {
    try {

        const coordinates = await resolveCoordinates(req.query);

        const data = await getHourlyWeather(coordinates);

        return res.status(200).json({
            success: true,
            message: "Hourly weather fetched successfully.",
            coordinates,
            data
        });

    } catch (error) {
        next(error);
    }
};