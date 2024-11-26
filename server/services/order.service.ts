import {Response } from "express";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import OrderModel from "../models/order.model";


//create new order
export const newOrder = CatchAsyncErrors(async(data:any,res:Response) =>{
    const order = await OrderModel.create(data);
    res.status(201).json({
        message:true,
        order
    })
   
})

//get all orders
export const getAllOdersServices = async(res:Response)=>{
    const orders = await OrderModel.find().sort({createdAt: -1});
    
    res.status(201).json({
        sucess:true,
        orders,
    })
}