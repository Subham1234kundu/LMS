require("dotenv").config();
import { Request,Response,NextFunction } from "express";
import userModel,{IUser} from "../models/user.model";
import ErrorHandeler from "../utlis/ErrorHandeler";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import jwt, { Secret } from "jsonwebtoken";


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
        
    } catch (error:any) {
        return next(new ErrorHandeler(error.message,400));
    }
});

interface IActivationToken{
    token:string;
    activationCode:string;
}

export const createActivationToken = (user:any): IActivationToken =>{
    const activationCode = Math.floor(1000+Math.random()*9000).toString();

    const token = jwt.sign({
        user,activationCode
    },process.env.ACTIVATION_SECRET as Secret,{
        expiresIn:'5m'
    });
    return {token,activationCode};
}