import {
    getCurrentWeather,
    getWeatherForecast,
    getHourlyWeather
} from "./weather.service.js";

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

// Current weather API
export const currentWeather = async (req, res, next) => {
    try {
        const { latitude, longitude } = req.query;

        const validationError = validateCoordinates(
            latitude,
            longitude
        );

        if (validationError) {
            const error = new Error(validationError);
            error.statusCode = 400;
            throw error;
        }

        const data = await getCurrentWeather({
            latitude: Number(latitude),
            longitude: Number(longitude)
        });

        return res.status(200).json({
            success: true,
            message: "Current weather fetched successfully.",
            data
        });

    } catch (error) {
        next(error);
    }
};

// Daily forecast API
export const weatherForecast = async (req, res, next) => {
    try {
        const { latitude, longitude, days = 7 } = req.query;

        const validationError = validateCoordinates(
            latitude,
            longitude
        );

        if (validationError) {
            const error = new Error(validationError);
            error.statusCode = 400;
            throw error;
        }

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

        const data = await getWeatherForecast({
            latitude: Number(latitude),
            longitude: Number(longitude),
            days: forecastDays
        });

        return res.status(200).json({
            success: true,
            message: "Weather forecast fetched successfully.",
            data
        });

    } catch (error) {
        next(error);
    }
};

// Hourly forecast API
export const hourlyWeather = async (req, res, next) => {
    try {
        const { latitude, longitude } = req.query;

        const validationError = validateCoordinates(
            latitude,
            longitude
        );

        if (validationError) {
            const error = new Error(validationError);
            error.statusCode = 400;
            throw error;
        }

        const data = await getHourlyWeather({
            latitude: Number(latitude),
            longitude: Number(longitude)
        });

        return res.status(200).json({
            success: true,
            message: "Hourly weather fetched successfully.",
            data
        });

    } catch (error) {
        next(error);
    }
};