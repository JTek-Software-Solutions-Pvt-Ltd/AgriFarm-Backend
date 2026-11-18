
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
export const getImdAwsData = ({ stationId, stateId }) =>
    fetchImdData("aws_data", {
        id: stationId,
        sid: stateId
    });


// 7. Get all IMD city forecast station mappings
export const getImdCityForecastMapping = async () => {
    return await fetchImdData("cityforecast_mapping");
};

