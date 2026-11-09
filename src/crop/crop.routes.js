import express from "express";
import { cropList } from "./crop.controller.js";

const router = express.Router();

router.get("/cropList", cropList);

export default router;