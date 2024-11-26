import express from "express";
import { isAuthenticated } from "../middleware/auth";
import { authorizeRoles } from "../controllers/user.controller";
import { getNotifications, updateNotification } from "../controllers/notification.controller";
const notificationRouter = express.Router();

notificationRouter.get("/get-all-notification",isAuthenticated,authorizeRoles("admin"),getNotifications);

notificationRouter.put("/update-notification/:id",isAuthenticated,authorizeRoles("admin"),updateNotification);

export default notificationRouter;
