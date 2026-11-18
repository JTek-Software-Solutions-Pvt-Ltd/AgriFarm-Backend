
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



export const imdStationMapping = async (req, res) => {
    try {
        const { search, state } = req.query;

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

        let result = stations;

        // Optional state filter
        if (state?.trim()) {
            result = result.filter(station =>
                String(station.states || "")
                    .toLowerCase() === state.trim().toLowerCase()
            );
        }

        // Search station name or code
        if (search?.trim()) {
            const keyword = search.trim().toLowerCase();

            // First try exact station name
            const exactMatches = result.filter(station =>
                String(station.Station_Name || "")
                    .trim()
                    .toLowerCase() === keyword
            );

            // If exact match exists, return only exact matches.
            // Otherwise, return partial matches.
            result = exactMatches.length > 0
                ? exactMatches
                : result.filter(station =>
                    String(station.Station_Name || "")
                        .toLowerCase().includes(keyword) ||
                    String(station.Station_Code || "")
                        .toLowerCase().includes(keyword)
                );
        }

        return res.status(200).json({
            success: true,
            message: "IMD station mapping fetched successfully.",
            provider: "IMD",
            total: result.length,
            data: result
        });

    } catch (error) {
        console.error("IMD Station Mapping Error:", error.message);

        return res.status(error.statusCode || 502).json({
            success: false,
            message: error.message || "Unable to fetch IMD station mapping."
        });
    }
};

