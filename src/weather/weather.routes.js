import express from "express";

import {
    currentWeather,
    weatherForecast,
    hourlyWeather
} from "./weather.controller.js";
import imdRoutes from "./imd/imd.routes.js";


const router = express.Router();

router.get("/current", currentWeather);
router.get("/forecast", weatherForecast);
router.get("/hourly", hourlyWeather);
router.use("/imd", imdRoutes);

export default router;