require("dotenv").config();
import { Request,Response,NextFunction } from "express";
import userModel,{IUser} from "../models/user.model";
import ErrorHandeler from "../utlis/ErrorHandeler";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import jwt, { Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utlis/sendMail";


//regidter user
interface IRegistrationBody{
    name: string,
    email: string,
    password: string,
    avatar?:string
}

export const registrationUser = CatchAsyncErrors(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const {name,email,password} = req.body;
        

        const isEmailExist = await userModel.findOne({email});
        if(isEmailExist){
            return next(new ErrorHandeler('Email is already exist',400));
        }

        const user:IRegistrationBody ={
            name,
            email,
            password,
        }

        const activationToken = createActivationToken(user);
        const activationCode = activationToken.activationCode;
        const data = {user: {name:user.name},activationCode};
        const html = await ejs.renderFile(path.join(__dirname,"../mails/activation-mail.ejs"),data);

        try {
            await sendMail({
                email:user.email,
                subject:"Activation Code",
                template:"activation-mail.ejs",
                data
            });
            res.status(201).json({
                sucess:true,
                message: `Please check your email: ${user.email} to activate your accunt!`,
                activationToken:activationToken.token,
            })
        } catch (error:any) {
            return next(new ErrorHandeler(error.message,400))
        }

        
    } catch (error:any) {
        return next(new ErrorHandeler(error.message,400));
    }
});

interface IActivationToken{
    token:string;
    activationCode:string;
}

//generate a activetion code for the user(otp)
export const createActivationToken = (user:any): IActivationToken =>{
    const activationCode = Math.floor(1000+Math.random()*9000).toString();

    const token = jwt.sign({
        user,activationCode
    },process.env.ACTIVATION_SECRET as Secret,{
        expiresIn:'5m'
    });
    return {token,activationCode};
}