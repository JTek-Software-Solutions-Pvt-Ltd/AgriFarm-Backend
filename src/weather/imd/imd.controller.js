
import {
    getImdCurrentWeather,
    getImdForecast,
    getImdWarnings,
    getImdNowcast,
    getImdRainfall,
    getImdAwsData,
    getImdCityForecastMapping,
    getUserLocation,
    findImdDistrictId,
    saveUserImdMapping,
    updateUserLocationFromCoordinates
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

export const imdAwsData = async (req, res) => {
    try {
        const { station_id, state_id } = req.query;

        const data = await getImdAwsData({
            callSign: station_id || null,
            imdStateId: state_id || null
        });

        return res.status(200).json({
            success: true,
            message: "IMD AWS/ARG data fetched successfully.",
            provider: "IMD",
            data
        });

    } catch (error) {
        console.error("IMD AWS error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
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

        // Get authenticated user ID
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        // 1. Get user's local district and state
        const user = await updateUserLocationFromCoordinates({
                userId,
                latitude: lat,
                longitude: lon
            });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (!user.district_name || !user.state_name) {
            return res.status(400).json({
                success: false,
                message: "User district and state are required."
            });
        }

        // 2. Fetch IMD station mapping
        const mapping = await getImdCityForecastMapping();

        const stations = Array.isArray(mapping)
            ? mapping
            : Array.isArray(mapping?.data)
                ? mapping.data
                : Array.isArray(mapping?.Data)
                    ? mapping.Data
                    : [];

        if (!stations.length) {
            return res.status(502).json({
                success: false,
                message: "No IMD station mapping records found."
            });
        }

        // 3. Find nearest IMD station
        const stationsWithDistance = stations
            .map((station) => {
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
                    station_id: String(station.Station_Code),
                    station_name: station.Station_Name,
                    state: station.states,
                    latitude: station.Latitude,
                    longitude: station.Longitude,
                    distance_km: Number(distance.toFixed(2))
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.distance_km - b.distance_km);

        if (!stationsWithDistance.length) {
            return res.status(404).json({
                success: false,
                message: "No valid IMD stations found."
            });
        }

        const nearestStation = stationsWithDistance[0];

        // 4. Find IMD district ID
        const imdDistrictId = await findImdDistrictId(
            user.district_name,
            user.state_name
        );

        if (!imdDistrictId) {
            return res.status(404).json({
                success: false,
                message: "IMD district mapping not found.",
                district: user.district_name,
                state: user.state_name
            });
        }

        // 5. Save station_id and imd_district_id in users table
        const saved = await saveUserImdMapping({
            userId,
            stationId: nearestStation.station_id,
            imdDistrictId
        });

        if (!saved) {
            return res.status(404).json({
                success: false,
                message: "Unable to update user IMD mapping."
            });
        }

        // 6. Return response
        return res.status(200).json({
            success: true,
            message: "IMD station and district mapping saved successfully.",
            provider: "IMD",
            data: {
                user_id: saved.id,
                station_id: saved.station_id,
                station_name: nearestStation.station_name,
                district_id: user.district_id,
                district_name: user.district_name,
                imd_district_id: saved.imd_district_id,
                state_id: user.state_id,
                state_name: user.state_name,
                latitude: lat,
                longitude: lon,
                distance_km: nearestStation.distance_km
            }
        });

    } catch (error) {
        console.error("IMD Station Mapping Error:", error);

        return res.status(error.statusCode || 502).json({
            success: false,
            message: error.message ||
                "Unable to fetch IMD station mapping."
        });
    }
};

