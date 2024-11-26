import express from "express"
import { activateUser, authorizeRoles, deleteUser, getAllUsers, getUserInfo, loginUser, logoutUser, registrationUser, socialAuth, updateAccessToken, updateProfilePicture, updateUserInfo, updateUserPassword, updateUserRole } from "../controllers/user.controller"
import { isAuthenticated } from "../middleware/auth";
const userRouter = express.Router();

userRouter.post("/registration", registrationUser);

userRouter.post("/activate-user", activateUser);
userRouter.post("/login", loginUser);
userRouter.get("/logout", isAuthenticated,logoutUser);
userRouter.get("/refresh", updateAccessToken);
userRouter.get("/me", isAuthenticated,getUserInfo);
userRouter.get("/social-auth", socialAuth);

userRouter.put("/update-user-info", isAuthenticated,updateUserInfo);

userRouter.put("/update-user-password", isAuthenticated,updateUserPassword);

userRouter.put("/update-user-avatar", isAuthenticated,updateProfilePicture);

userRouter.get("/get-all-users", isAuthenticated,authorizeRoles("admin"),getAllUsers);


userRouter.put("/update-user", isAuthenticated,authorizeRoles("admin"),updateUserRole);


userRouter.delete("/delete-user/:id", isAuthenticated,authorizeRoles("admin"),deleteUser);




export default userRouter;

