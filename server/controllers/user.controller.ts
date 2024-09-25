require("dotenv").config();
import { Request,Response,NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandeler from "../utlis/ErrorHandeler";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import jwt, { Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utlis/sendMail";
import { sendToken } from "../utlis/jwt";


//regidter user
interface IRegistrationBody{
    name: string,
    email: string,
    password: string,
    avatar?:string
}

//registration to the users and send a mail . user get random genarated otp code.
export const registrationUser = CatchAsyncErrors(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        //request to the registation user
        const {name,email,password} = req.body;
        
        //get user model schema from the database and select mail.
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


        //send to the data to sendMail function.
        try {
            await sendMail({
                email:user.email,
                subject:"Activation Code",
                template:"activation-mail.ejs",
                data
            });
        //if the message generated then send the message to the user .
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
    //generate 4 digit otp code and sve as a string .
    const activationCode = Math.floor(1000+Math.random()*9000).toString();

    //generate token to the registerd users .
    const token = jwt.sign({
        user,activationCode
    },process.env.ACTIVATION_SECRET as Secret,{
        expiresIn:'5m'
    });
    return {token,activationCode};
}

//activate users 
interface IActivationRequest {
    activation_token:string;
    activation_code:string;
};


//actiavate user function
export const activateUser = CatchAsyncErrors (async(req:Request,res:Response,next:NextFunction)=>{
    try {
        //request for the token to body
        const {activation_token,activation_code} = req.body as IActivationRequest;
        
        //decode the token to get the user and activation code .
        const newUser:{user:IUser; activationCode:string} = jwt.verify(
            activation_token,
            process.env.ACTIVATION_SECRET as Secret
        ) as {user:IUser; activationCode:string};

        //if the activation code is not match send a error to the user
        if(newUser.activationCode !== activation_code){
            return next(new ErrorHandeler("Invalid action code",400))
        }
        
        
        const {name,email,password} = newUser.user;

        //find the user mail fom the databse .
        const existUser = await userModel.findOne({email});
        if(existUser){
            return next(new ErrorHandeler("Email already exist",400))
        }
        
        //create user component if exiest. 
        const user = await userModel.create({
            name,
            email,
            password
        });

        res.status(201).json({
            success:true,
        });

    } catch (error:any) {
        
    }
});


//login user
interface ILoginRequest {
    email: string;
    password: string;
};
export const loginUser = CatchAsyncErrors (async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const {email,password} = req.body as ILoginRequest;

        if(!email || !password){
            return next(new ErrorHandeler("Please enter email and password",400));
        };

        const user = await userModel.findOne({email}).select("+password");
        if(!user){
            return next(new ErrorHandeler("Invalid email or password",401))
        };

        const isPasswordMatch = await user.comparePassword(password);
        if(!isPasswordMatch){
            return next(new ErrorHandeler("Invalid email or password",401));
        };

        sendToken(user,200,res);


    } catch (error:any) {
        return next(new ErrorHandeler(error.message,400))
    }
});

//logout user
export const logoutUser = CatchAsyncErrors(async(req:Request,res:Response,next:NextFunction) => {
    try {
        res.cookie("acess_token","",{maxAge:1});
        res.cookie("refresh_token","",{maxAge:1});
        res.status(200).json({
            success:true,
            message:"Logged out sucessfully"
        });
    } catch (error:any) {
        return next(new ErrorHandeler(error.message,400))
    }
});


//when logout remove data in redis database




