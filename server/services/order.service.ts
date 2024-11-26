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