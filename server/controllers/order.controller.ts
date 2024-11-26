import { NextFunction,Request,Response } from "express";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandeler from "../utlis/ErrorHandeler";
import OrderModel, {IOrder} from "../models/order.model";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import path from "path";
import ejs from "ejs";
import sendMail from "../utlis/sendMail";
import NotificationModel from "../models/notification.model";
import { newOrder, getAllOdersServices } from "../services/order.service";


//create Order
export const createOrder = CatchAsyncErrors(async (req: Request, res: Response, next:NextFunction) =>{
    try{
        const {courseId, payment_info} = req.body as IOrder;

        const user =  await userModel.findById(req.user?._id);

        if (!user) {
            return next(new ErrorHandeler("User  not found", 404));
        }

        //if the user buy any course then the he/she cant buy same course again
        const courseExistInUser =  user?.courses.some((course:any)=> course._id.toString() === courseId);
        
        if(courseExistInUser){
            return next(new ErrorHandeler("You have already purchased the course",400));
        };

        const course = await CourseModel.findById(courseId);
        if(!course){
            return next(new ErrorHandeler("Course not found",404));
        };

        const data:any = {
            courseId:course._id,
            userId:user?._id,
            payment_info,
        };
        
        

        const mailData = {
            order:{
                _id: course._id.toString().slice(0,6),
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString('en-US',{year:'numeric',month:"long",day:"numeric"}),
            }
        };

        const html = await ejs.renderFile(path.join(__dirname,"../mails/order-confirmation.ejs"),{order:mailData});
        try {
            if(user){
                await sendMail({
                    email:user.email,
                    subject:"Order Confirmation",
                    template:"order-confirmation.ejs",
                    data:mailData
                });
            }
        }catch (error: any) {
            return next(new ErrorHandeler(error.message, 500));
        }

        user?.courses.push(course?._id);
        await user?.save();
        
        
        await NotificationModel.create({
            user:user?._id,
            title:"New Order",
            message:`You have purchased ${course?.name} course`
        });

        //if user purchase a coursce it will be updated by one 
        course.purchased ? course.purchased += 1 :course.purchased;

        await course.save();
        newOrder(data,res,next);

    }catch (error: any) {
        return next(new ErrorHandeler(error.message, 500));
    }
});


//get all orders --- only for Admin 
export const getAllOrders = CatchAsyncErrors( async(req:Request, res:Response, next:NextFunction)=>{
    try {
        getAllOdersServices(res);
    }catch (error:any) {
        return next(new ErrorHandeler(error.message, 400));
    }
});