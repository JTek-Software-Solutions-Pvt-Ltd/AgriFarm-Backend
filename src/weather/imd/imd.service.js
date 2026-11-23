import pool from "../../config/db.js";

const normalizeName = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

const normalizeState = (value) => {
    const state = normalizeName(value);

    const stateAliases = {
        "orissa": "odisha",
        "odhisha": "odisha"
    };

    return stateAliases[state] || state;
};

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

    if (!apiKey) {
        throw new Error("IMD API key is missing.");
    }

    const token = await getImdAccessToken(forceRefresh);

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
            const headers = await getImdHeaders(attempt === 1);

            const response = await fetch(url, {
                method: "GET",
                headers,
                signal: AbortSignal.timeout(15000)
            });

            const responseText = await response.text();

            let data;

            try {
                data = responseText
                    ? JSON.parse(responseText)
                    : null;
            } catch {
                data = responseText;
            }

            // If token expired unexpectedly, generate a new one
            if (response.status === 401 && attempt === 0) {

                console.warn(
                    "IMD returned 401. Refreshing token and retrying..."
                );

                accessToken = null;
                tokenExpiresAt = 0;

                continue;
            }

            if (!response.ok) {

                console.error("IMD API Error:", {
                    endpoint,
                    status: response.status,
                    response: data
                });

                const error = new Error(
                    `IMD API request failed with status ${response.status}.`
                );

                error.statusCode = response.status;
                throw error;
            }

            return data;

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

    throw new Error(
        "IMD API request failed after token refresh."
    );
};


// 1. Current weather
export const getImdCurrentWeather = (stationId) =>
    fetchImdData("current_wx", { id: stationId });

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
            d.name AS district_name,
            s.name AS state_name
         FROM users u
         LEFT JOIN districts d
            ON d.id = u.district_id
         LEFT JOIN state s
            ON s.id = u.state_id
         WHERE u.id = $1
         LIMIT 1`,
        [userId]
    );

    return result.rows[0] || null;
};

// 9. Find IMD district ID using local district and state
export const findImdDistrictId = async (districtName, stateName) => {

    const response = await getImdDistrictMapping();

    const records = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.Data)
                ? response.Data
                : [];

    const matchedDistrict = records.find(item => {

        const imdDistrict = normalizeName(item.District);
        const imdState = normalizeState(item.State);

        return (
            imdDistrict === normalizeName(districtName) &&
            imdState === normalizeState(stateName)
        );
    });

    if (!matchedDistrict) {
        console.log("IMD district not matched:", {
            districtName,
            stateName
        });

        return null;
    }

    console.log("Matched IMD district:", {
        district: matchedDistrict.District,
        state: matchedDistrict.State,
        imdDistrictId: matchedDistrict.Obj_id
    });

    return String(
        matchedDistrict.Obj_id ??
        matchedDistrict.OBJ_ID ??
        matchedDistrict.obj_id
    );
};

// 10. Save IMD station and district IDs in users table
export const saveUserImdMapping = async ({
    userId,
    stationId,
    imdDistrictId
}) => {
    const result = await pool.query(
        `UPDATE users
         SET
            station_id = $1,
            imd_district_id = $2
         WHERE id = $3
         RETURNING
            id,
            station_id,
            imd_district_id`,
        [
            stationId,
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
        throw new Error("State or district could not be identified.");
    }

    const stateResult = await pool.query(
        `SELECT id, name
         FROM state
         WHERE LOWER(TRIM(name)) = $1
         LIMIT 1`,
        [normalizeState(location.stateName)]
    );

    if (!stateResult.rows.length) {
        throw new Error(`State not found: ${location.stateName}`);
    }

    const state = stateResult.rows[0];

    const districtResult = await pool.query(
        `SELECT id, name
         FROM districts
         WHERE state_id = $1
           AND LOWER(TRIM(name)) = $2
         LIMIT 1`,
        [state.id, normalizeName(location.districtName)]
    );

    if (!districtResult.rows.length) {
        throw new Error(`District not found: ${location.districtName}`);
    }

    const district = districtResult.rows[0];

    const updateResult = await pool.query(
        `UPDATE users
         SET state_id = $1,
             district_id = $2,
             latitude = $3,
             longitude = $4
         WHERE id = $5
         RETURNING id, state_id, district_id, latitude, longitude`,
        [state.id, district.id, latitude, longitude, userId]
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
