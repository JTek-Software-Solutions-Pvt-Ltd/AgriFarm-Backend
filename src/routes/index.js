import authRoutes from "../auth/auth.routes.js";
//import cropRoutes from "../modules/crop/crop.routes.js";
//import mandiRoutes from "../modules/mandi/mandi.routes.js";

export const registerRoutes = (app) => {

    app.use("/api/auth", authRoutes);
   // app.use("/api/crop", cropRoutes);
    //app.use("/api/mandi", mandiRoutes);

};