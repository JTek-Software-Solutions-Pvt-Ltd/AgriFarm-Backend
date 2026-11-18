
import {
    getImdCurrentWeather,
    getImdForecast,
    getImdWarnings,
    getImdNowcast,
    getImdRainfall,
    getImdAwsData,
    getImdCityForecastMapping
} from "./imd.service.js";

const sendResponse = async (res, message, serviceCall) => {
    try {
        const data = await serviceCall();

        return res.status(200).json({
            success: true,
            message,
            provider: "IMD",
            data
        });
    } catch (error) {
        return res.status(error.statusCode || 502).json({
            success: false,
            message: error.message || "Unable to fetch IMD data."
        });
    }
};

const validateId = (value) =>
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 100;

export const imdCurrentWeather = (req, res) => {
    const { station_id } = req.query;

    if (!validateId(station_id)) {
        return res.status(400).json({
            success: false,
            message: "Valid station_id is required."
        });
    }

    return sendResponse(
        res,
        "IMD current weather fetched successfully.",
        () => getImdCurrentWeather(station_id)
    );
};

export const imdForecast = (req, res) => {
    const { station_id } = req.query;

    if (!validateId(station_id)) {
        return res.status(400).json({
            success: false,
            message: "Valid station_id is required."
        });
    }

    return sendResponse(
        res,
        "IMD forecast fetched successfully.",
        () => getImdForecast(station_id)
    );
};

export const imdWarnings = (req, res) => {
    const { district_id } = req.query;

    if (!validateId(district_id)) {
        return res.status(400).json({
            success: false,
            message: "Valid district_id is required."
        });
    }

    return sendResponse(
        res,
        "IMD district warnings fetched successfully.",
        () => getImdWarnings(district_id)
    );
};

export const imdNowcast = (req, res) => {
    const { district_id } = req.query;

    if (!validateId(district_id)) {
        return res.status(400).json({
            success: false,
            message: "Valid district_id is required."
        });
    }

    return sendResponse(
        res,
        "IMD district nowcast fetched successfully.",
        () => getImdNowcast(district_id)
    );
};

export const imdRainfall = (req, res) => {
    const { district_id } = req.query;

    if (!validateId(district_id)) {
        return res.status(400).json({
            success: false,
            message: "Valid district_id is required."
        });
    }

    return sendResponse(
        res,
        "IMD district rainfall fetched successfully.",
        () => getImdRainfall(district_id)
    );
};

export const imdAwsData = (req, res) => {
    const { station_id, state_id } = req.query;

    if (!validateId(station_id) && !validateId(state_id)) {
        return res.status(400).json({
            success: false,
            message: "Provide a valid station_id or state_id."
        });
    }

    return sendResponse(
        res,
        "IMD AWS/ARG data fetched successfully.",
        () => getImdAwsData({
            stationId: station_id,
            stateId: state_id
        })
    );
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = (degree) => degree * (Math.PI / 180);
    const R = 6371; // Earth's radius in KM
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

export const imdStationMapping = async (req, res) => {
    try {
        const { latitude, longitude } = req.query;

        // Validate coordinates
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: "Latitude and longitude are required."
            });
        }

        const lat = Number(latitude);
        const lon = Number(longitude);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon) ||
            lat < -90 || lat > 90 ||
            lon < -180 || lon > 180
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid latitude or longitude."
            });
        }

        // Fetch IMD station mapping
        const mapping = await getImdCityForecastMapping();

        const stations = Array.isArray(mapping)
            ? mapping
            : Array.isArray(mapping?.data)
                ? mapping.data
                : Array.isArray(mapping?.Data)
                    ? mapping.Data
                    : null;

        if (!stations) {
            return res.status(502).json({
                success: false,
                message: "Unexpected response received from IMD station mapping."
            });
        }

        // Calculate distance from farmer location to each IMD station
        const stationsWithDistance = stations
            .map(station => {
                const stationLat = Number(station.Latitude);
                const stationLon = Number(station.Longitude);

                if (
                    !Number.isFinite(stationLat) ||
                    !Number.isFinite(stationLon) ||
                    stationLat < -90 || stationLat > 90 ||
                    stationLon < -180 || stationLon > 180
                ) {
                    return null;
                }

                const distance = calculateDistance(
                    lat,
                    lon,
                    stationLat,
                    stationLon
                );

                return {
                    station_id: station.Station_Code,
                    Station_Code: station.Station_Code,
                    Station_Name: station.Station_Name,
                    state: station.states,
                    latitude: station.Latitude,
                    longitude: station.Longitude,
                    distance_km: Number(distance.toFixed(2))
                };
            })
            .filter(Boolean);

        if (stationsWithDistance.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No valid IMD stations found."
            });
        }

        // Sort nearest station first
        stationsWithDistance.sort(
            (a, b) => a.distance_km - b.distance_km
        );

        // Return nearest station
        const nearestStation = stationsWithDistance[0];

        return res.status(200).json({
            success: true,
            message: "Nearest IMD station fetched successfully.",
            provider: "IMD",
            farmer_location: {
                latitude: lat,
                longitude: lon
            },
            data: nearestStation
        });

    } catch (error) {
        console.error("IMD Station Mapping Error:", error.message);

        return res.status(error.statusCode || 502).json({
            success: false,
            message: error.message || "Unable to fetch IMD station mapping."
        });
    }
};
