import { Request } from "express";
import { IUser } from "../models/user.model";

//we can access the user anywhere we want
declare global {
    namespace Express {
        interface Request {
            user?:IUser
        }
    }
}