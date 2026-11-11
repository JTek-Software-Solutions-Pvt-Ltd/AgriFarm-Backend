import pool from "../config/db.js";

const CURRENT_FIELDS = [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "is_day",
    "precipitation",
    "rain",
    "weather_code",
    "cloud_cover",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m"
];

const HOURLY_FIELDS = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation_probability",
    "precipitation",
    "weather_code",
    "wind_speed_10m"
];

const DAILY_FIELDS = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "apparent_temperature_min",
    "precipitation_sum",
    "precipitation_probability_max",
    "sunrise",
    "sunset",
    "wind_speed_10m_max"
];

const fetchWeather = async (params) => {
    const query = new URLSearchParams(params);

    const response = await fetch(
        `${process.env.WEATHER_API_URL}?${query.toString()}`,
        { signal: AbortSignal.timeout(15000) }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.reason || "Unable to fetch weather information."
        );
        error.statusCode = 502;
        throw error;
    }

    return data;
};

// Current weather
export const getCurrentWeather = async ({ latitude, longitude }) => {
    return await fetchWeather({
        latitude,
        longitude,
        current: CURRENT_FIELDS.join(","),
        timezone: "auto"
    });
};

// Daily forecast
export const getWeatherForecast = async ({
    latitude,
    longitude,
    days = 7
}) => {
    return await fetchWeather({
        latitude,
        longitude,
        daily: DAILY_FIELDS.join(","),
        forecast_days: String(days),
        timezone: "auto"
    });
};

// Hourly forecast
export const getHourlyWeather = async ({
    latitude,
    longitude
}) => {
    return await fetchWeather({
        latitude,
        longitude,
        hourly: HOURLY_FIELDS.join(","),
        forecast_hours: "24",
        timezone: "auto"
    });
};

export const getUserCoordinates = async (userId) => {

    const result = await pool.query(
        `SELECT id, latitude, longitude
         FROM users
         WHERE id = $1`,
        [userId]
    );

    if (result.rows.length === 0) {
        const error = new Error("User not found.");
        error.statusCode = 404;
        throw error;
    }

    const user = result.rows[0];

    if (user.latitude === null || user.longitude === null) {
        const error = new Error(
            "User location not available. Please update your location."
        );
        error.statusCode = 400;
        throw error;
    }

    return {
        latitude: Number(user.latitude),
        longitude: Number(user.longitude)
    };
};