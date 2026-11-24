import pool from "../../config/db.js";

const IMD_BASE_URL =
    process.env.IMD_BASE_URL || "https://api.imd.gov.in/api/v1";

const IMD_TOKEN_URL =
    "https://api.imd.gov.in/api/oauth/token.php";

// In-memory token cache
let accessToken = null;
let tokenType = "Bearer";
let tokenExpiresAt = 0;
let tokenRequestPromise = null;

// Generate or reuse IMD JWT token
const getImdAccessToken = async (forceRefresh = false) => {

    // Reuse existing valid token
    if (
        !forceRefresh &&
        accessToken &&
        Date.now() < tokenExpiresAt
    ) {
        return accessToken;
    }

    // Prevent multiple simultaneous token requests
    if (tokenRequestPromise) {
        return tokenRequestPromise;
    }

    tokenRequestPromise = (async () => {
        try {
            const email = process.env.IMD_EMAIL;
            const password = process.env.IMD_PASSWORD;

            if (!email || !password) {
                throw new Error(
                    "IMD email or password is missing."
                );
            }

            const response = await fetch(IMD_TOKEN_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                }),
                signal: AbortSignal.timeout(15000)
            });

            const data = await response.json();

            if (!response.ok || !data.access_token) {
                console.error("IMD Token Generation Failed:", {
                    status: response.status,
                    message: data.message || data.error
                });

                throw new Error(
                    "Unable to generate IMD access token."
                );
            }

            accessToken = data.access_token;
            tokenType = data.token_type || "Bearer";

            const expiresIn = Number(data.expires_in);

            if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
                accessToken = null;
                throw new Error(
                    "Invalid IMD token expiry received."
                );
            }

            // Refresh 5 minutes before actual expiry
            const refreshAfter = Math.max(
                30,
                expiresIn - 300
            );

            tokenExpiresAt =
                Date.now() + refreshAfter * 1000;

            console.log(
                `IMD access token generated. Next refresh in ${Math.round(refreshAfter / 60)} minutes.`
            );

            return accessToken;

        } catch (error) {
            accessToken = null;
            tokenExpiresAt = 0;

            console.error(
                "IMD Token Error:",
                error.message
            );

            throw error;

        } finally {
            tokenRequestPromise = null;
        }
    })();

    return tokenRequestPromise;
};


// Generate headers for IMD weather APIs
const getImdHeaders = async (forceRefresh = false) => {
    const apiKey = process.env.IMD_API_KEY;

    /*if (!apiKey) {
        throw new Error("IMD API key is missing.");
    }*/

    const token = await getImdAccessToken(forceRefresh);

    if (!token) {
        throw new Error("IMD access token is missing.");
    }

    return {
        "X-API-KEY": apiKey,
        "Authorization": `${tokenType} ${token}`,
        "Accept": "application/json"
    };
};


// Fetch IMD API data with automatic token refresh

export const fetchImdData = async (endpoint, params = {}) => {

    const url = new URL(`${IMD_BASE_URL}/${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            url.searchParams.set(key, String(value));
        }
    });

    for (let attempt = 0; attempt < 2; attempt++) {

        try {
            // First attempt: use cached token
            // Second attempt: force generate a fresh token
            const headers = await getImdHeaders(attempt === 1);

            const response = await fetch(url, {
                method: "GET",
                headers,
                signal: AbortSignal.timeout(15000)
            });

            // Read response body only once
            const responseText = await response.text();

            let responseData;

            try {
                responseData = responseText
                    ? JSON.parse(responseText)
                    : null;
            } catch {
                responseData = responseText;
            }

            // Retry once if the access token has expired
            if (response.status === 401 && attempt === 0) {
                console.warn(
                    `IMD API returned 401 for ${endpoint}. Refreshing token...`
                );
                continue;
            }

            // Handle other unsuccessful responses
            if (!response.ok) {
                console.error("IMD API error:", {
                    endpoint,
                    url: url.toString(),
                    status: response.status,
                    response: responseData
                });

                const error = new Error(
                    `IMD API request failed with status ${response.status}.`
                );

                error.statusCode = response.status;
                error.details = responseData;

                throw error;
            }

            return responseData;

        } catch (error) {

            if (
                error.name === "TimeoutError" ||
                error.name === "AbortError"
            ) {
                const timeoutError = new Error(
                    "IMD API request timed out."
                );

                timeoutError.statusCode = 504;
                throw timeoutError;
            }

            throw error;
        }
    }

    const error = new Error(
        "IMD API request failed after token refresh."
    );

    error.statusCode = 401;

    throw error;
};



// 1. Current weather
export const getImdCurrentWeather = (stationId = null) =>
    fetchImdData(
        "current_wx",
        stationId ? { id: stationId } : {}
    );

// 2. Seven-day forecast
export const getImdForecast = (stationId) =>
    fetchImdData("cityforecastloc", { id: stationId });

// 3. District warnings
export const getImdWarnings = (districtId) =>
    fetchImdData("districtwarning", { id: districtId });

// 4. District nowcast
export const getImdNowcast = (districtId) =>
    fetchImdData("districtnowcast", { id: districtId });

// 5. District rainfall
export const getImdRainfall = (districtId) =>
    fetchImdData("districtrainfall", { id: districtId });

// 6. AWS/ARG observations
export const getImdAwsData = ({ callSign, imdStateId } = {}) => {

    if (callSign) {
        return fetchImdData("aws_data", {
            id: callSign
        });
    }

    if (imdStateId) {
        return fetchImdData("aws_data", {
            sid: imdStateId
        });
    }

    throw new Error("AWS station CALL_SIGN or IMD state ID is required.");
};

export const getImdAwsMapping = () =>
    fetchImdData("aws_data_mapping");

// 7. Get all IMD city forecast station mappings
export const getImdCityForecastMapping = async () => {
    return await fetchImdData("cityforecast_mapping");
};

export const getImdDistrictMapping = async () => {
    return await fetchImdData("state_district_rainfall_forecast");
};

// 8. Get user's district and state from database
export const getUserLocation = async (userId) => {
    const result = await pool.query(
        `SELECT
            u.id AS user_id,
            u.state_id,
            u.district_id,
            u.latitude,
            u.longitude,
            u.station_id,
            u.city_forecast_station_code,
            u.current_weather_station_id,
            u.imd_district_id,
            u.aws_call_sign,
            s.imd_state_id,
            d.name AS district_name,
            s.name AS state_name
         FROM users u
         LEFT JOIN districts d ON d.id = u.district_id
         LEFT JOIN state s ON s.id = u.state_id
         WHERE u.id = $1
         LIMIT 1`,
        [userId]
    );

    return result.rows[0] || null;
};

// 9. Find IMD district ID using local district and state

const normalizeName = (value) => {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/\bdistrict\b/g, "")
        .replace(/[^a-z0-9]/g, "");
};

const normalizeState = (value) => {
    const normalized = normalizeName(value);

    const stateAliases = {
        orissa: "odisha",
        odhisha: "odisha"
    };

    return stateAliases[normalized] || normalized;
};

// Add aliases only for known spelling variations.
const districtAliases = {
    "sripottisriramulunellore": "nellore",
    "sripottisriramulunellore": "nellore",
    "spsrnellore": "nellore"
};

const normalizeDistrict = (value) => {
    const normalized = normalizeName(value);

    return districtAliases[normalized] || normalized;
};

export const findImdDistrictId = async (
    districtName,
    stateName
) => {
    try {
        if (!districtName || !stateName) {
            return null;
        }

        const response = await getImdDistrictMapping();

        const records = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response?.Data)
                    ? response.Data
                    : [];

        const targetDistrict = normalizeDistrict(districtName);
        const targetState = normalizeState(stateName);

        // First try exact normalized district and state matching.
        let matchedDistrict = records.find(item =>
            normalizeDistrict(item.District) === targetDistrict &&
            normalizeState(item.State) === targetState
        );

        // Fallback: compare district names without the alias mapping.
        if (!matchedDistrict) {
            matchedDistrict = records.find(item =>
                normalizeName(item.District) === normalizeName(districtName) &&
                normalizeState(item.State) === targetState
            );
        }

        if (!matchedDistrict) {
            console.log("IMD district not matched:", {
                localDistrict: districtName,
                localState: stateName,
                normalizedDistrict: targetDistrict,
                normalizedState: targetState,
                possibleMatches: records
                    .filter(item =>
                        normalizeState(item.State) === targetState
                    )
                    .map(item => ({
                        district: item.District,
                        state: item.State,
                        obj_id: item.Obj_id ?? item.OBJ_ID ?? item.obj_id
                    }))
            });

            return null;
        }

        const id =
            matchedDistrict.Obj_id ??
            matchedDistrict.OBJ_ID ??
            matchedDistrict.obj_id;

        if (id === undefined || id === null || id === "") {
            console.log("IMD district matched but ID missing:", matchedDistrict);
            return null;
        }

        console.log("IMD district matched:", {
            localDistrict: districtName,
            imdDistrict: matchedDistrict.District,
            state: matchedDistrict.State,
            imdDistrictId: String(id)
        });

        return String(id);

    } catch (error) {
        console.error("findImdDistrictId error:", error.message);
        throw error;
    }
};


// 10. Save IMD station and district IDs in users table
export const saveUserImdMapping = async ({
    userId,
    cityForecastStationCode,
    currentWeatherStationId = null,
    imdDistrictId
}) => {
    const result = await pool.query(
        `UPDATE users
         SET
            station_id = $1,
            city_forecast_station_code = $1,
            current_weather_station_id = $2,
            imd_district_id = $3
         WHERE id = $4
         RETURNING
            id,
            station_id,
            city_forecast_station_code,
            current_weather_station_id,
            imd_district_id`,
        [
            cityForecastStationCode,
            currentWeatherStationId,
            imdDistrictId,
            userId
        ]
    );

    return result.rows[0] || null;
};



// Reverse geocode coordinates
export const getLocationFromCoordinates = async (latitude, longitude) => {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");

    url.searchParams.set("lat", latitude);
    url.searchParams.set("lon", longitude);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
        headers: {
            "User-Agent": "AgriFarm-Backend/1.0 (location lookup)"
        }
    });

    if (!response.ok) {
        throw new Error("Unable to identify location from coordinates.");
    }

    const data = await response.json();
    const address = data.address || {};

    return {
        stateName: address.state || null,
        districtName:
            address.state_district ||
            address.district ||
            address.county ||
            null,
        address
    };
};

// Match location against your local database and update user
export const updateUserLocationFromCoordinates = async ({
    userId,
    latitude,
    longitude
}) => {
    const location = await getLocationFromCoordinates(
        latitude,
        longitude
    );

    if (!location.stateName || !location.districtName) {
        throw new Error(
            "State or district could not be identified from coordinates."
        );
    }

    // Find state after normalizing both names
    const stateResult = await pool.query(
        `SELECT id, name
         FROM state`
    );

    const state = stateResult.rows.find(
        item =>
            normalizeState(item.name) ===
            normalizeState(location.stateName)
    );

    if (!state) {
        throw new Error(
            `State not found in local database: ${location.stateName}`
        );
    }

    // Find district only within the matched state
    const districtResult = await pool.query(
        `SELECT id, name
         FROM districts
         WHERE state_id = $1`,
        [state.id]
    );

    const district = districtResult.rows.find(
        item =>
            normalizeName(item.name) ===
            normalizeName(location.districtName)
    );

    if (!district) {
        throw new Error(
            `District not found in local database: ${location.districtName}`
        );
    }

    const updateResult = await pool.query(
        `UPDATE users
         SET state_id = $1,
             district_id = $2,
             latitude = $3,
             longitude = $4
         WHERE id = $5
         RETURNING
            id,
            state_id,
            district_id,
            latitude,
            longitude`,
        [
            state.id,
            district.id,
            latitude,
            longitude,
            userId
        ]
    );

    if (!updateResult.rows.length) {
        throw new Error("User not found.");
    }

    return {
        ...updateResult.rows[0],
        state_name: state.name,
        district_name: district.name
    };
};

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const toRadians = value => value * Math.PI / 180;
    const earthRadiusKm = 6371;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return 2 * earthRadiusKm *
        Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getNearestCurrentWeatherStation = async (
    latitude,
    longitude
) => {
    const result = await pool.query(
        `SELECT
            station_id,
            station_name,
            latitude,
            longitude
         FROM imd_current_weather_stations
         WHERE is_active = TRUE`
    );

    if (!result.rows.length) {
        return null;
    }

    const stations = result.rows.map(station => {
        const distance = calculateDistanceKm(
            Number(latitude),
            Number(longitude),
            Number(station.latitude),
            Number(station.longitude)
        );

        return {
            station_id: station.station_id,
            station_name: station.station_name,
            latitude: Number(station.latitude),
            longitude: Number(station.longitude),
            distance_km: Number(distance.toFixed(2))
        };
    });

    stations.sort(
        (a, b) => a.distance_km - b.distance_km
    );

    return stations[0];
};

export const getImdStateIdByLocalStateId = async (localStateId) => {
    const result = await pool.query(
        `SELECT imd_state_id
         FROM state
         WHERE id = $1
         LIMIT 1`,
        [localStateId]
    );

    return result.rows[0]?.imd_state_id || null;
};