import { NextFunction,Request,Response } from "express";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandeler from "../utlis/ErrorHandeler";
import cloudinary from "cloudinary";
import { createCourse } from "../services/course.service";
import CourseModel from "../models/course.model";
import { redis } from "../utlis/redis";
import mongoose from "mongoose";
import path from "path";
import ejs from "ejs";
import sendMail from "../utlis/sendMail";


//upload course
export const uploadCourse = CatchAsyncErrors(async (req: Request, res: Response, next:NextFunction)=>{
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        if(thumbnail){
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail,{
                folder: "courses",
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            }
        }
        createCourse(data,res,next);
        
    } catch (error:any) {
        return next(new ErrorHandeler(error.message, 500));
    }
});

//edit course course
export const editCourse = CatchAsyncErrors(async (req: Request, res: Response, next:NextFunction)=>{
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;

        //if the thumnail exiest then destroy it at 1st then save updated data in cloudinary
        if(thumbnail){
           await cloudinary.v2.uploader.destroy(thumbnail.public_id);
           const myCloud = await cloudinary.v2.uploader.upload(thumbnail,{
            folder: "courses",
           });

           data.thumbnail = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
           };

        }

        const courseId = req.params.id;
        //findByIdAndUpdate() returns the document as it was before the update.
        const course = await CourseModel.findByIdAndUpdate(courseId,
            {
                //Update the course's fields using the data provided in the request body.
                $set:data
            },
            {
                //Return the newly updated version of the course 
                new:true,
            }
        );

        res.status(201).json({
            success: true,
            course
        })
    } catch (error:any) {
        return next(new ErrorHandeler(error.message, 500));
    }
});

//get single course --- without purchaseing
export const getSingleCourse = CatchAsyncErrors(async (req: Request, res: Response, next:NextFunction)=>{
    try {
        
        const courseId = req.params.id;
        const isCacheExist = await redis.get(courseId);

        //if the data exiest in redis db then then show the exist the data from redis 
        if(isCacheExist){
            const course = JSON.parse(isCacheExist);
            res.status(200).json({
                success: true,
                course,
            });
        }
        else{
        //to protect our video data , link and hide them.
        const course = await CourseModel.findById(req.params.id).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links ");

        await redis.set(courseId, JSON.stringify(course));
        
        res.status(200).json({
            success: true,
            course
        });
        }

    } catch (error: any) {
        return next(new ErrorHandeler(error.message, 500));
    }
});

//get all courses --- without purchasing
export const getAllCourses = CatchAsyncErrors(async (req: Request, res: Response, next:NextFunction)=>{
    try {
        
        const isCacheExist = await redis.get("allCourses");
        if(isCacheExist){
            const course = JSON.parse(isCacheExist);
            res.status(200).json({
                success: true,
                course,
            });
        }else{
        //to protect our video data , link and hide them .
        const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links ");
        
        //create a allcourese folder in redis to check if allCourse exist then the data will be fetch from redis DB 
        await redis.set("allCourses",JSON.stringify(courses))
        res.status(200).json({
            success: true,
            courses
        });
        }

    } catch (error: any) {
        return next(new ErrorHandeler(error.message, 500))
    }
});


//get course content --- only for valid user
export const getCourseByUser = CatchAsyncErrors(async (req: Request, res: Response, next:NextFunction)=>{
    try {
        const userCourseList = req.user?.courses;
        const courseId = req.params.id;

        const courseExiests = userCourseList?.find((course:any)=> course._id.toString() === courseId);
        if(!courseExiests){
            return next(new ErrorHandeler("you are not eligible to access this course",404));
        }

        const course = await CourseModel.findById(courseId);

        const content = course?.courseData;
        res.status(200).json({
            success: true,
            content
        });

    } catch (error: any) {
        return next(new ErrorHandeler(error.message, 500))
    }
});


//add questions in course
interface IAddQuestionsData{
    question: string;
    courseId: string;
    contentId: string;
}

export const addQuestion = CatchAsyncErrors(async (req: Request, res: Response, next:NextFunction)=>{
    try {
        const {question, courseId, contentId}: IAddQuestionsData = req.body;
        //find the course
        const course = await CourseModel.findById(courseId);

        //cheak the content ID not valid and send the error.
        if(!mongoose.Types.ObjectId.isValid(contentId)){
            return next(new ErrorHandeler("Invalid content ID", 400));
        } ;

        //find the course content from the course data.its check course data's current id is equals to the contentId or not 
        const courseContent = course?.courseData?.find((item:any)=> item._id.equals(contentId));

        if(!courseContent){
            return next(new ErrorHandeler("Invalid content ID", 400));
        };

        //create a new questions object
        const newQuestion:any={
            user:req.user,
            question,
            questionReplies:[]
        };

        //add this question to our course content
        courseContent.questions.push(newQuestion);

        //save the updated course
        await course?.save();

        res.status(201).json({
            success: true,
            course
        });

    } catch (error: any) {
        return next(new ErrorHandeler(error.message, 500));
    }
});

//Add answer in course question
interface IAddAnswerData{
    answer: string;
    questionId: string;
    courseId: string;
    contentId: string;
};
export const addAnswer = CatchAsyncErrors(async (req: Request, res: Response, next:NextFunction) =>{
    try {
        const {answer,questionId, courseId, contentId}: IAddAnswerData = req.body;
        //find the course
        const course = await CourseModel.findById(courseId);

        //cheak the content ID not valid and send the error.
        if(!mongoose.Types.ObjectId.isValid(contentId)){
            return next(new ErrorHandeler("Invalid content ID", 400));
        } ;

        //find the course content from the course data.its check course data's current id is equals to the contentId or not 
        const courseContent = course?.courseData?.find((item:any)=> item._id.equals(contentId));

        if(!courseContent){
            return next(new ErrorHandeler("Invalid content ID", 400));
        };

        //find the exeact question 
        const quiestion = courseContent?.questions?.find((item:any)=>item._id.equals(questionId));
        if(!quiestion){
            return next(new ErrorHandeler("Invalid question ID", 400));
        };

        //create a new ans object
        const newAnswer:any = {
            user:req.user,
            answer
        };

        //add this ans to our course content
        quiestion.questionReplies.push(newAnswer);

        await course?.save();

        //reply
        if(req.user?._id === quiestion.user._id){
            //create a notification 
        }else{
            const data = {
                name:quiestion.user.name,
                title:courseContent.title,
            }

            const html = await ejs.renderFile(path.join(__dirname,"../mails/question-reply.ejs"),data);

            try{
                await sendMail({
                    email: quiestion.user.email,
                    subject:"Question rewply",
                    template: "question-reply.ejs",
                    data,
                });
            }catch (error: any) {
                return next(new ErrorHandeler(error.message, 500));
            }
        }

        res.status(200).json({
            sucess: true,
            course
        })


        

    } catch (error: any) {
        return next(new ErrorHandeler(error.message, 500));
    }
})


