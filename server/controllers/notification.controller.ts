import NotificationModel from "../models/notification.model";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import { NextFunction,Response,Request } from "express";
import ErrorHandeler from "../utlis/ErrorHandeler";
import cron from "node-cron";

// get all notification  --- only admin
export const getNotifications = CatchAsyncErrors(async (req:Request,res:Response,next:NextFunction)=>{
    try {

        //when new notification come then it will shown at the top thats why short it reverce
        const notifications = await NotificationModel.find().sort({createdAt:-1});

        res.status(201).json({
            status:true,
            notifications
        })
    } catch (error:any) {
        return next(new ErrorHandeler(error.message,500))
    };
});


//update notification status --- only admin
export const updateNotification = CatchAsyncErrors(async (req:Request,res:Response,next:NextFunction)=>{
    try {
        const notification = await NotificationModel.findById(req.params.id);
        if(!notification){
            return next(new ErrorHandeler('Notification not found',404))
        }else{
            //if the admin read the notification then it will be readed in frontend
            notification.status ? notification.status = "read" : notification.status;
        };

        await notification.save();

        const notifications = await NotificationModel.find().sort({createdAt:-1});

        res.status(201).json({
            status:true,
            notifications
        })
        
    } catch (error:any) {
        return next(new ErrorHandeler(error.message,500))
    }
});

//delete notification --- only admin
cron.schedule("0 0 0 * * *",async()=>{
    const thiryDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
    //delete notification after 30 days if the status is read
    await NotificationModel.deleteMany({status:"read",createdAt:{$lt:thiryDaysAgo}});
    console.log("Deleted read notifications");
});