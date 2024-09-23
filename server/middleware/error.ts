import { NextFunction, Request, Response } from "express";
import ErrorHandeler from "../utlis/ErrorHandeler";

export const ErrorMiddleware = (err:any,req:Request,res:Response,next:NextFunction)=>{
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal server Error';

    //wrong mogodbId
    if(err.name === 'CastError'){
        const message = `Resource not found. Invalid :${err.path} :${err.value}`
        err = new ErrorHandeler(message,400)
    }

    //Duplicate key error
    if(err.code === 11000){
        const message = `Duplicate  ${Object.keys(err.keyValue)} entered`;
        err = new ErrorHandeler(message,400)
    };

    //wrong jwt error
    if(err.name === 'JsonWebTokenError'){
        const message = 'Your json web token is invalid, Please login again';
        err = new ErrorHandeler(message,401);
    }

    //jwt expire
    if(err.name === 'TokenExpiredError'){
        const message = 'Your json web token has expired, Please login again';
        err = new ErrorHandeler(message,401);
    }
    
    res.status(err.statusCode).json({
        suscess:false,
        message:err.message
    })

}