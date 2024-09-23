import {Redis} from "ioredis"
require("dotenv").config();

const redisClient = () =>{
    if(process.env.RADIS_URL){
        console.log("Radis Connected");
        return process.env.RADIS_URL;
    }
    throw new Error("Radis connection is failed");
}

export const redis = new Redis(redisClient());