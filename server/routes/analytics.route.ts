import express from "express";
import { isAuthenticated } from "../middleware/auth";
import { authorizeRoles } from "../controllers/user.controller";
import { getCoursesAnalytics, getOrdersAnalytics, getUserAnalytics } from "../controllers/analytics.controller";
const analyticsRouter = express.Router();

analyticsRouter.get("/get-user-analytics",isAuthenticated,authorizeRoles("admin"),getUserAnalytics);
analyticsRouter.get("/get-order-analytics",isAuthenticated,authorizeRoles("admin"),getOrdersAnalytics);
analyticsRouter.get("/get-course-analytics",isAuthenticated,authorizeRoles("admin"),getCoursesAnalytics);

export default analyticsRouter;
