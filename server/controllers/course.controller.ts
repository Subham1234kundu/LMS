import { NextFunction,Request,Response } from "express";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandeler from "../utlis/ErrorHandeler";
import cloudinary from "cloudinary";
import { createCourse, getAllcoursesServices } from "../services/course.service";
import CourseModel from "../models/course.model";
import { redis } from "../utlis/redis";
import mongoose from "mongoose";
import path from "path";
import ejs from "ejs";
import sendMail from "../utlis/sendMail";
import NotificationModel from "../models/notification.model";


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

        await NotificationModel.create({
            user:req.user?._id,
            title:"New Question Recived",
            message:`You have a new question in ${courseContent.title}`,
        })

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
            await NotificationModel.create({
                user:req.user?._id,
                title:"New Question Reply Recived",
                message:`You have a new question reply in ${courseContent.title}`
            })
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
});

//add review in course
interface IAddReviewData {
    rating: number;
    review: string;
    userId: string;
}
export const addReview = CatchAsyncErrors(async(req: Request, res: Response, next:NextFunction)=>{
    try {
        const userCourseList = req.user?.courses;
        const courseId = req.params.id;

        //check if the courseId already exiest in userCourseList based on _id 
        const courseExiests = userCourseList?.some((course:any)=> course._id.toString() === courseId.toString());

        if(!courseExiests){
            return next(new ErrorHandeler("You are not elegible to access this course",404));
        }

        const course = await CourseModel.findById(courseId);

        const {review,rating} = req.body as IAddReviewData

        const reviewData:any =  {
            user:req.user,
            comment:review,
            rating
        };

        //push review data in course review session
        course?.reviews.push(reviewData);

        let avg = 0;
        
        //we get 2 review one is 5 and another one is 4 , 0+5 = 5 ,5+4 = 9
        course?.reviews.forEach((rev:any)=>{
            avg += rev.rating
        });

        //total rateing is 9/2 = 4.5
        if(course){
            course.ratings =  avg / course.reviews.length;
        }

        await course?.save();

        const notification = {
            title: "New Review Recived",
            message: `New review recived from ${req.user?.name} on ${course?.name}`
        }

        //create notification 

        res.status(200).json({
            success:true,
            course
        });

    } catch (error: any) {
        return next(new ErrorHandeler(error.message, 500));
    }
});

//add reply in review 
interface  IAddReviewReplyData{
    comment:string,
    courseId:string,
    reviewId:string
}
export const addReplytoReview =  CatchAsyncErrors(async(req: Request, res: Response, next:NextFunction)=>{
    try {
        const {comment,courseId,reviewId} = req.body as IAddReviewReplyData;
        const course = await CourseModel.findById(courseId);
        if(!course){
            return next(new ErrorHandeler('Course not found', 404));
        };

        const review = course?.reviews?.find((rev:any) => rev._id.toString() === reviewId);
        if(!review){
            return next(new ErrorHandeler('Review not found', 404));
        };

        const replyData:any = {
            user: req.user,
            comment,
        };

        if(!review.commentReplies){
            review.commentReplies = [];
        }

        review.commentReplies?.push(replyData);

        await course?.save();

        res.status(200).json({
            success:true,
            course
        });


    }catch (error: any) {
        return next(new ErrorHandeler(error.message, 500));
    }
});



//get all users --- only for Admin 
export const getAllCoursesforAdmin = CatchAsyncErrors( async(req:Request, res:Response, next:NextFunction)=>{
    try {
        getAllcoursesServices(res);
    }catch (error:any) {
        return next(new ErrorHandeler(error.message, 400));
    }
});


// delete course --- only for admin
export const deleteCourse = CatchAsyncErrors(async(req:Request, res:Response, next:NextFunction)=>{
    try {
        const {id} = req.params;
        const course = await CourseModel.findById(id);

        if(!course){
            return next(new ErrorHandeler("user not found", 404));
        };

        await course.deleteOne({id});
        await redis.del(id);

        res.status(200).json({
            success:true,
            message:"Course deleted successfully"
        })
    } catch (error:any) {
        return next(new ErrorHandeler(error.message, 400));       
    }
});









