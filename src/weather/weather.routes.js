import express from "express";

import {
    currentWeather,
    weatherForecast,
    hourlyWeather
} from "./weather.controller.js";

const router = express.Router();

router.get("/current", currentWeather);
router.get("/forecast", weatherForecast);
router.get("/hourly", hourlyWeather);

export default router;