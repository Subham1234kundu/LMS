import { Response } from "express";
import { redis } from "../utlis/redis";
import userModel from "../models/user.model";

//get user by Id
export const getUserById = async (id:string, res:Response)=>{
    const userJson = await redis.get(id);

    if(userJson){
        const user = JSON.parse(userJson);
        res.status(201).json({
            success:true,
            user
        });
    };
};

//get all users
export const getAllUsersServices = async(res:Response)=>{
    const users = await userModel.find().sort({createdAt: -1});
    
    res.status(201).json({
        sucess:true,
        users,
    })
}

//update user role,,
export const updateUserRoleServices = async(res:Response,id:string,role:string)=>{
    const user = await userModel.findByIdAndUpdate(id, {role},{new:true});

    res.status(201).json({
        success:true,
        user,
    })
}