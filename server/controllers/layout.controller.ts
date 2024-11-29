import { Request,Response,NextFunction } from "express";
import ErrorHandeler from "../utlis/ErrorHandeler";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import cloudinary from "cloudinary"
import LayoutModel from "../models/layout.modal";
//create layout
export const createLayout = CatchAsyncErrors(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const {type} = req.body;
        const isTypeExist = await LayoutModel.findOne({type});
        if(isTypeExist){
            return next (new ErrorHandeler(`${type} already exist`,400));
        }
        if(type === "Banner"){
            const {image,title,subTitle} = req.body;
            const myCloud = await cloudinary.v2.uploader.upload(image,{
                folder:"layout",
            });
            const banner = {
                image:{
                    public_id:myCloud.public_id,
                    url:myCloud.secure_url,
                },
                title,
                subTitle
            }
            await LayoutModel.create(banner);
        };

        if(type === "FAQ"){
            const{faq} = req.body;
            const faqItems = await Promise.all(
                faq.map(async(item:any)=>{
                    return{
                        question:item.question,
                        answer:item.answer
                    };
                })
            );
            await LayoutModel.create({type:"FAQ",faq:faqItems})
        };

        if(type === "Catagories"){
            const {catagories} = req.body;
            const catagoriesItems = await Promise.all(
                catagories.map(async(item:any)=>{
                    return{
                        title:item.title
                    };
                })
            );

            await LayoutModel.create({type:"Catagories",categories:catagoriesItems});
        };

        res.status(201).json({
            success:true,
            message:"layout created successfully",
        });

    } catch (error:any) {
        return next(new ErrorHandeler(error.message,500));
    }
});