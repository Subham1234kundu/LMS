require("dotenv").config();
import { Request,Response,NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandeler from "../utlis/ErrorHandeler";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utlis/sendMail";
import { acessTokenOpctions, refreshTokenOpctions, sendToken } from "../utlis/jwt";
import { redis } from "../utlis/redis";
import { getUserById } from "../services/user.service";
import cloudinary from "cloudinary"


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
        const userId = req.user?._id as any;
        //when logout remove data in redis database
        redis.del(userId)
        res.status(200).json({
            success:true,
            message:"Logged out sucessfully"
        });
    } catch (error:any) {
        return next(new ErrorHandeler(error.message,400))
    }
});

//update acess token
export const updateAccessToken = CatchAsyncErrors(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        //generate a new refresh token
        const refresh_token = req.cookies.refresh_token as string;
        //veryfy the token
        const decoded = jwt.verify(refresh_token,process.env.REFRESH_TOKEN as string) as JwtPayload;

        const message = "Could not refresh token";
        if(!decoded){
            return next(new ErrorHandeler(message,400));
        }


        //Retrieves the session data associated with the user’s ID from Redis database
        const session = await redis.get(decoded.id as string);
        if(!session){
            return next(new ErrorHandeler(message,400));
        }

        //convert the data as a string
        const user = JSON.parse(session);

        //createing new access token and refresh token
        const acessToken = jwt.sign({id:user._id}, process.env.ACESS_TOKEN as string,{expiresIn: "5m"});
        const refreshToken = jwt.sign({id:user._id},process.env.REFRESH_TOKEN as string,{expiresIn:"3d"});

        //SET THE USERS
        req.user = user

        //setting tokens to the cookies
        res.cookie("acess_token",acessToken,acessTokenOpctions);
        res.cookie("refresh_token",refreshToken,refreshTokenOpctions);

        res.status(200).json({
            status:"sucess",
            acessToken,
        });


    } catch (error:any) {
        return next(new ErrorHandeler(error.message,400))
    }
})



//validate user role
export const authorizeRoles = (...roles:string[]) =>{
    return (req:Request,res:Response,next:NextFunction)=>{
        if(!roles.includes(req.user?.role || "")){
            return next(new ErrorHandeler(`Role: ${req.user?.role} is not allow to acess this resorce`,403))
        }
        next();
    }
};


//get user Info
export const getUserInfo = CatchAsyncErrors(async(req:Request,res:Response,next:NextFunction)=>{
    try {
       const userId  = req.user?._id as any;
       getUserById(userId,res);
    } catch (error:any){
        return next(new ErrorHandeler(error.message,400));
    }
});




//social auth
interface ISocialAuthBody{
    name:string;
    email:string;
    avatar:string;
   
}

//if we get our data from frontend then the function will be worked
export const socialAuth = CatchAsyncErrors(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const {email,name,avatar} = req.body as ISocialAuthBody;
        const user = await userModel.findOne({email});

        //if the user not loggedin then create the new user 
        if(!user){
            const newUser = await userModel.create({email,name,avatar});
            sendToken(newUser,200,res);
        }else{
            sendToken(user,200,res);
        }

    } catch (error:any){
        return next(new ErrorHandeler(error.message,400));
    }
});



//update user info
interface IUpdateUserInfo {
    name?: string;
    email?: string;
};

export const updateUserInfo = CatchAsyncErrors(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const {name,email} = req.body as IUpdateUserInfo;
        const userId = req.user?._id as any;
        const user = await userModel.findById(userId);
        
        if(email && user){
            const isEmailExist = await userModel.findOne({email});
            if(isEmailExist){
                return next(new ErrorHandeler("Email already exist",400));     
            }
            user.email = email;
        }

        if(name && user){
            user.name = name;
        }
        await user?.save();
        await redis.set(userId,JSON.stringify(user));

        res.status(201).json({
            success:true,
            user
        });
    } catch (error:any) {
        return next(new ErrorHandeler(error.message, 400))
    }
});



//update user password
interface IUpdateUserPassword {
    oldPassword: string;
    newPassword: string;
};

export const updateUserPassword = CatchAsyncErrors(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const {oldPassword,newPassword}= req.body as IUpdateUserPassword;

        if(!oldPassword || !newPassword){
            return next(new ErrorHandeler("Please enter old and new password",400));
        };

        const user = await userModel.findById(req.user?._id).select("+password");

        if(user?.password === undefined){
            return next(new ErrorHandeler("Invalid user",400));
        };

        const isPasswordMatch = await user?.comparePassword(oldPassword);
        if(!isPasswordMatch){
            return next(new ErrorHandeler(" Invalid Old password",400));
        };

        user.password = newPassword;

        await user.save();

        await redis.set(req.user?._id as any ,JSON.stringify(user));

        res.status(200).json({
            success:true,
            user,
        });
    } catch (error:any) {
        return next(new ErrorHandeler(error.message, 400))
    }
});


//Update profile picture
interface IUpdateProfilePicture {
    avatar:string;
}
export const updateProfilePicture = CatchAsyncErrors(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const {avatar} = req.body;
        const userID = req.user?._id;
        const user = await userModel.findById(userID);


        //if the user and avatar are exist then
        if(avatar && user){

            //if the user have any avatar
            if(user?.avatar?.public_id){
                //first delete the old image
                await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);

                //then save the new image in cloud
                const myCloud = await cloudinary.v2.uploader.upload(avatar,{
                    folder:"avatars",
                    width:150,
                });
                user.avatar = {
                    public_id:myCloud.public_id,
                    url: myCloud.secure_url
                }
            }else{
               const myCloud = await cloudinary.v2.uploader.upload(avatar,{
                    folder:"avatars",
                    width:150,
                });
                user.avatar = {
                    public_id:myCloud.public_id,
                    url: myCloud.secure_url
                }
    
            }
        }

        await user?.save();
        await redis.set(userID as any, JSON.stringify(user));

        res.status(200).json({
            success:true,
            user,
        })
        
    } catch (error:any) {
        return next(new ErrorHandeler(error.message, 400));
    }
    
})















