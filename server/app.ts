import express, { NextFunction ,Request,Response} from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
export const app = express();
require("dotenv").config();
import { ErrorMiddleware } from "./middleware/error";
import userRouter from "./routes/user.route";
import courseRouter from "./routes/course.route";
import orderRouter from "./routes/order.routs";
import notificationRouter from "./routes/notification.route";
import analyticsRouter from "./routes/analytics.route";

//body parser 
app.use(express.json({limit:"50mb"}));

//cookie parser
app.use(cookieParser());

//cors => cross origin resorce shareing
//(frome our localhost and our website we can acess the api otherwise our code through a error)
app.use(cors({
    origin:process.env.ORIGIN,
}));

//routes
app.use("/api/v1",userRouter,courseRouter,orderRouter,notificationRouter,analyticsRouter);



//testing api 
app.get("/test",(req:Request,res:Response,next:NextFunction)=>{
    res.status(200).json({
        sucess:true,
        message:"Api is working"
    });
});

//unknown routes
app.all("*",(req:Request,res:Response,next:NextFunction)=>{
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statusCode = 404;
    next(err);
});

app.use(ErrorMiddleware);
