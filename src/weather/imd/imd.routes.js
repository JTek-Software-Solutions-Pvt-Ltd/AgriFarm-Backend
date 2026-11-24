
import express from "express";
import { authenticateToken } from "../../middleware/auth.middleware.js";
import {
    imdCurrentWeather,
    imdForecast,
    imdWarnings,
    imdNowcast,
    imdRainfall,
    imdAwsData,
    imdStationMapping
} from "./imd.controller.js";

const router = express.Router();

/*router.get("/current", imdCurrentWeather);
router.get("/forecast", imdForecast);
router.get("/warnings", imdWarnings);
router.get("/nowcast", imdNowcast);
router.get("/rainfall", imdRainfall);
router.get("/aws", imdAwsData);
router.get("/stations", authenticateToken, imdStationMapping);*/
router.get(
    "/stations",
    authenticateToken,
    imdStationMapping
);

router.get(
    "/current",
    authenticateToken,
    imdCurrentWeather
);

router.get(
    "/forecast",
    authenticateToken,
    imdForecast
);

router.get(
    "/warnings",
    authenticateToken,
    imdWarnings
);

router.get(
    "/nowcast",
    authenticateToken,
    imdNowcast
);

router.get(
    "/rainfall",
    authenticateToken,
    imdRainfall
);

router.get(
    "/aws",
    authenticateToken,
    imdAwsData
);

export default router;
