import { Request,Response,NextFunction } from "express";
import ErrorHandeler from "../utlis/ErrorHandeler";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import { generateLast12MonthsData } from "../utlis/analytics";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import OrderModel from "../models/order.model";

//get user analytics --- only for admin
export const getUserAnalytics = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction)=>{
    try {
        const users =  await generateLast12MonthsData(userModel);

        res.status(200).json({
            success:true,
            users
        })
    } catch (error:any) {
        return next(new ErrorHandeler(error.message, 500));
    }
});


export const getCoursesAnalytics = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction)=>{
    try {
        const courses =  await generateLast12MonthsData(CourseModel);

        res.status(200).json({
            success:true,
            courses
        })
    } catch (error:any) {
        return next(new ErrorHandeler(error.message, 500));
    }
});



export const getOrdersAnalytics = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction)=>{
    try {
        const orders =  await generateLast12MonthsData(OrderModel);

        res.status(200).json({
            success:true,
            orders
        })
    } catch (error:any) {
        return next(new ErrorHandeler(error.message, 500));
    }
});