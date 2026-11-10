const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";

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
        `${WEATHER_API_URL}?${query.toString()}`,
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