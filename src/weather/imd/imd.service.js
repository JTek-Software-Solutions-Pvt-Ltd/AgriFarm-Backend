const IMD_BASE_URL =
    process.env.IMD_BASE_URL || "https://api.imd.gov.in/api/v1";

const getImdHeaders = () => {
    const apiKey = process.env.IMD_API_KEY;
    const jwtToken = process.env.IMD_JWT_TOKEN;

    if (!apiKey || !jwtToken) {
        const error = new Error(
            "IMD API key or JWT token is missing."
        );
        error.statusCode = 500;
        throw error;
    }

    return {
        "X-API-KEY": apiKey,
        "Authorization": `Bearer ${jwtToken}`,
        "Accept": "application/json"
    };
};

export const fetchImdData = async (endpoint, params = {}) => {
    const url = new URL(`${IMD_BASE_URL}/${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, String(value));
        }
    });

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: getImdHeaders(),
            signal: AbortSignal.timeout(15000)
        });

        const responseText = await response.text();

        let data;
        try {
            data = responseText ? JSON.parse(responseText) : null;
        } catch {
            data = responseText;
        }

        if (!response.ok) {
            console.error("IMD API Error:", {
                status: response.status,
                response: data
            });

            const error = new Error(
                `IMD API request failed with status ${response.status}.`
            );

            error.statusCode = 502;
            error.imdStatus = response.status;
            throw error;
        }

        return data;

    } catch (error) {
        if (error.name === "TimeoutError" ||
            error.name === "AbortError") {
            const timeoutError = new Error("IMD API request timed out.");
            timeoutError.statusCode = 504;
            throw timeoutError;
        }

        throw error;
    }
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

