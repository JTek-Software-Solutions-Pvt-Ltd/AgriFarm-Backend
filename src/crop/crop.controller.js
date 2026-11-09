import { getAllCrops } from "./crop.service.js";

/**
 * @type {import("express").RequestHandler}
 */
export const cropList = async (_req, res) => {
    try {
        const crops = await getAllCrops();

        return res.status(200).json({
            success: true,
            message: "Crop list fetched successfully.",
            total: crops.length,
            data: crops
        });

    } catch (error) {
        console.error("Crop list error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch crop list."
        });
    }
};