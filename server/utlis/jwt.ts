require("dotenv").config();
import {Response} from "express"
import { IUser } from "../models/user.model";
import {redis} from "./redis"

interface ITokenOpctions{
    expires: Date;
    maxAge:number;
    httpOnly:boolean;
    sameSite:"lax" | "strict" | "none" | undefined;
    sequre?: boolean;
}

 //parse enviorment variable to intrigiate with fallback values
 const acessTokenExpire = parseInt(
    process.env.ACCESS_TOKEN_EXPIRE || "300",
    10
);
const refreshTokenExpire = parseInt(
    process.env.REFRESH_TOKEN_EXPIRE || "1200",
    10
);

//opctions create for cookies
export const acessTokenOpctions:ITokenOpctions = {
    expires:new Date(Date.now() + acessTokenExpire * 60 * 60 * 1000),
    maxAge:acessTokenExpire * 60 * 60 * 1000,
    httpOnly:true,
    sameSite:"lax"
};
export const refreshTokenOpctions:ITokenOpctions = {
    expires:new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000,),
    maxAge:refreshTokenExpire * 24 * 60 * 60 * 1000,
    httpOnly:true,
    sameSite:"lax"
};

export const sendToken = (user:IUser,statusCode:number,res:Response)=>{
    const acessToken = user.signAcessToken();
    const refreshToken = user.signRefreshToken();

    //upload the session to redis
    redis.set(user._id as any, JSON.stringify(user) as any);


   

    //only sequre to true in production
    if(process.env.NODE_ENV === "production"){
        acessTokenOpctions.sequre = true;
    }

    res.cookie("acess_token",acessToken,acessTokenOpctions);
    res.cookie("refresh_token",refreshToken,refreshTokenOpctions);

    res.status(statusCode).json({
        sucess:true,
        acessToken,
        user
    })
}