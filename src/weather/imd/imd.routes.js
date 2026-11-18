
import express from "express";

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

router.get("/current", imdCurrentWeather);
router.get("/forecast", imdForecast);
router.get("/warnings", imdWarnings);
router.get("/nowcast", imdNowcast);
router.get("/rainfall", imdRainfall);
router.get("/aws", imdAwsData);
router.get("/stations", imdStationMapping);

export default router;
