import express from "express"
import { isAuthenticated } from "../middleware/auth";
import { authorizeRoles } from "../controllers/user.controller";
import { addAnswer, addQuestion, addReplytoReview, addReview, editCourse, getAllCourses, getAllCoursesforAdmin, getCourseByUser, getSingleCourse, uploadCourse } from "../controllers/course.controller";
const courseRouter = express.Router();

courseRouter.post("/create-course",isAuthenticated,authorizeRoles("admin"),uploadCourse);

courseRouter.put("/edit-course/:id",isAuthenticated,authorizeRoles("admin"),editCourse);

courseRouter.get("/get-course/:id",getSingleCourse);
courseRouter.get("/get-courses",getAllCourses);

courseRouter.get("/get-course-content/:id",isAuthenticated,getCourseByUser);

courseRouter.put("/add-question",isAuthenticated,addQuestion);

courseRouter.put("/add-answer",isAuthenticated,addAnswer);

courseRouter.put("/add-review/:id",isAuthenticated,addReview);

courseRouter.put("/add-reply",isAuthenticated,authorizeRoles("admin"),addReplytoReview);

courseRouter.get("/get-all-Courses",isAuthenticated,authorizeRoles("admin"),getAllCoursesforAdmin);

export default courseRouter;