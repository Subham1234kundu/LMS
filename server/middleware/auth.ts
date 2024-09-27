require("dotenv").config();
import { Request,Response,NextFunction } from "express";
import { CatchAsyncErrors } from "./catchAsyncErrors";
import ErrorHandeler from "../utlis/ErrorHandeler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utlis/redis";

export const isAuthenticated = CatchAsyncErrors(async(req:Request,res:Response,next:NextFunction)=>{
    //acess_token
    const acess_token = req.cookies.acess_token as string;
    
    if(!acess_token){
        return next(new ErrorHandeler("please login for the acess token",400));
    }

    const decoded = jwt.verify(acess_token,process.env.ACESS_TOKEN as string) as JwtPayload;

    if(!decoded){
        return next(new ErrorHandeler("acess token is not valid",400));
    }

    const user = await redis.get(decoded.id);
    if(!user){
        return next(new ErrorHandeler("user not found",400));
    }

    req.user = JSON.parse(user);

    next();

})