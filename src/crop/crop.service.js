import pool from "../config/db.js";

// GET ALL CROPS
export const getAllCrops = async () => {
    const result = await pool.query(
        `SELECT *
         FROM crop
         ORDER BY id ASC`
    );

    return result.rows;
};