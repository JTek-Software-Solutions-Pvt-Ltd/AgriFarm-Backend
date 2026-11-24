
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
    updateUserLocationFromCoordinates,
    getNearestCurrentWeatherStation
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

export const imdCurrentWeather = async (req, res, next) => {
    try {
        console.log("1. IMD Current Weather Controller called");

        const userId = req.user?.userId;
        let stationId = req.query.station_id || null;

        console.log("2. User ID:", userId);
        console.log("3. Requested station ID:", stationId);

        if (!stationId && userId) {
            const user = await getUserLocation(userId);
            stationId = user?.current_weather_station_id || null;
        }

        console.log("4. Final station ID:", stationId);

        const data = await getImdCurrentWeather(stationId);

        console.log("5. IMD service response received");

        return res.status(200).json({
            success: true,
            message: stationId
                ? "IMD current weather fetched successfully."
                : "IMD current weather station list fetched successfully.",
            provider: "IMD",
            station_id: stationId,
            data
        });
    } catch (error) {
        console.error("IMD Current Weather Error:", error);
        next(error);
    }
};

export const imdForecast = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        let stationId = req.query.station_id || null;

        if (!stationId && userId) {
            const user = await getUserLocation(userId);
            stationId = user?.city_forecast_station_code || null;
        }

        if (!validateId(stationId)) {
            return res.status(409).json({
                success: false,
                message:
                    "City forecast station is not mapped. Call the IMD station mapping API first."
            });
        }

        const data = await getImdForecast(stationId);

        return res.status(200).json({
            success: true,
            message: "IMD forecast fetched successfully.",
            provider: "IMD",
            station_id: stationId,
            data
        });

    } catch (error) {
        next(error);
    }
};

export const imdWarnings = async (req, res, next) => {
    try {
        const districtId = await getRequestDistrictId(req);

        if (!validateId(districtId)) {
            return res.status(409).json({
                success: false,
                message: "IMD district is not mapped for this user."
            });
        }

        const data = await getImdWarnings(districtId);

        return res.status(200).json({
            success: true,
            message: "IMD district warnings fetched successfully.",
            provider: "IMD",
            district_id: districtId,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const imdNowcast = async (req, res, next) => {
    try {
        const districtId = await getRequestDistrictId(req);

        if (!validateId(districtId)) {
            return res.status(409).json({
                success: false,
                message: "IMD district is not mapped for this user."
            });
        }

        const data = await getImdNowcast(districtId);

        return res.status(200).json({
            success: true,
            message: "IMD district nowcast fetched successfully.",
            provider: "IMD",
            district_id: districtId,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const imdRainfall = async (req, res, next) => {
    try {
        const districtId = await getRequestDistrictId(req);

        if (!validateId(districtId)) {
            return res.status(409).json({
                success: false,
                message: "IMD district is not mapped for this user."
            });
        }

        const data = await getImdRainfall(districtId);

        return res.status(200).json({
            success: true,
            message: "IMD district rainfall fetched successfully.",
            provider: "IMD",
            district_id: districtId,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const imdAwsData = async (req, res, next) => {
    try {
        let callSign = req.query.call_sign ||
            req.query.station_id ||
            null;

        let imdStateId = req.query.imd_state_id ||
            req.query.state_id ||
            null;

        const userId = req.user?.userId;

        if (!callSign && !imdStateId && userId) {
            const user = await getUserLocation(userId);

            callSign = user?.aws_call_sign || null;
            imdStateId = user?.imd_state_id || null;
        }

        const data = await getImdAwsData({
            callSign,
            imdStateId
        });

        return res.status(200).json({
            success: true,
            message: "IMD AWS/ARG data fetched successfully.",
            provider: "IMD",
            data
        });

    } catch (error) {
        next(error);
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

        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        // 1. Reverse geocode and save local state/district
        const user = await updateUserLocationFromCoordinates({
            userId,
            latitude: lat,
            longitude: lon
        });

        // 2. Fetch IMD city forecast mapping
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
                message: "No IMD city forecast station records found."
            });
        }

        // 3. Find nearest city forecast station
        const forecastStations = stations
            .map(station => {
                const stationLat = Number(station.Latitude);
                const stationLon = Number(station.Longitude);
                const stationCode = station.Station_Code;

                if (
                    stationCode === undefined ||
                    stationCode === null ||
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
                    station_code: String(stationCode),
                    station_name: station.Station_Name || null,
                    latitude: stationLat,
                    longitude: stationLon,
                    distance_km: Number(distance.toFixed(2))
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.distance_km - b.distance_km);

        if (!forecastStations.length) {
            return res.status(404).json({
                success: false,
                message: "No valid city forecast stations found."
            });
        }

        const nearestForecastStation = forecastStations[0];

        // 4. Find nearest verified current-weather station
        const nearestCurrentStation =
            await getNearestCurrentWeatherStation(lat, lon);

        // 5. Resolve IMD district ID
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

        // 6. Save both station identifiers separately
        const saved = await saveUserImdMapping({
            userId,
            cityForecastStationCode:
                nearestForecastStation.station_code,
            currentWeatherStationId:
                nearestCurrentStation?.station_id || null,
            imdDistrictId
        });

        if (!saved) {
            return res.status(404).json({
                success: false,
                message: "Unable to update user IMD mapping."
            });
        }

        return res.status(200).json({
            success: true,
            message: "User IMD mapping saved successfully.",
            provider: "IMD",
            data: {
                user_id: saved.id,

                city_forecast: {
                    station_code:
                        saved.city_forecast_station_code,
                    station_name:
                        nearestForecastStation.station_name,
                    distance_km:
                        nearestForecastStation.distance_km
                },

                current_weather: nearestCurrentStation
                    ? {
                        station_id:
                            saved.current_weather_station_id,
                        station_name:
                            nearestCurrentStation.station_name,
                        distance_km:
                            nearestCurrentStation.distance_km
                    }
                    : {
                        station_id: null,
                        message:
                            "No verified current-weather station coordinates are available."
                    },

                location: {
                    state_id: user.state_id,
                    state_name: user.state_name,
                    district_id: user.district_id,
                    district_name: user.district_name,
                    imd_district_id: saved.imd_district_id,
                    latitude: lat,
                    longitude: lon
                }
            }
        });

    } catch (error) {
        console.error("IMD Station Mapping Error:", error);

        return res.status(error.statusCode || 502).json({
            success: false,
            message: error.message ||
                "Unable to map IMD stations."
        });
    }
};

const getRequestDistrictId = async (req) => {
    // Explicit ID is useful for admin/testing requests
    if (req.query.district_id) {
        return req.query.district_id;
    }

    const userId = req.user?.userId;

    if (!userId) {
        return null;
    }

    const user = await getUserLocation(userId);

    return user?.imd_district_id || null;
};