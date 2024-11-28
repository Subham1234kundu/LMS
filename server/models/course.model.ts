import mongoose,{Document,Model,Schema}from "mongoose";
import { IUser } from "./user.model";


interface IComment extends Document{
    user:IUser,
    question:string
    questionReplies: IComment[];
}

interface IReview extends Document{
    user:IUser,
    rating:number,
    comment:string;
    commentReplies?: IComment[];
}

interface ILink extends Document{
    title: string;
    url: string;
}

interface ICourseData extends Document{
    title:string;
    description:string;
    videoUrl: string;
    videoThumbnail: object;
    videoLength: number;
    videoPlayer:string;
    videoSection:string,
    links:ILink[];
    suggestion: string;
    questions: IComment[];
}

interface ICourse extends Document{
    name:string;
    description?:string;
    price:number;
    estimatedPrice?: number;
    thumbnail: object;
    tags:string;
    level:string;
    demoUrl: string;
    benifits: {title: string}[];
    prerequiests:{title:string}[];
    ratings?:number;
    purchased?: number;
    reviews: IReview[];
    courseData:ICourseData[];
}

const reveiwSchema = new Schema<IReview>({
    user:Object,
    rating:{
        type:Number,
        default:0,
    },
    comment:String,
    commentReplies: [Object],
});

const linkSchema = new Schema<ILink>({
    title: String,
    url: String
});

const commentSchema = new Schema<IComment>({
    user:Object,
    question:String,
    questionReplies: [Object],
});

const couseDataSchema = new Schema<ICourseData>({
    videoUrl: String,
    title:String,
    description:String,
    videoLength: Number,
    videoSection:String,
    videoPlayer: String,
    links:[linkSchema],
    suggestion:String,
    questions:[commentSchema]
});

const courseSchema = new Schema<ICourse>({
    name:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    price:{
        type:Number,
        required:true,
    },
    estimatedPrice:{
        type:Number,
    },
    thumbnail:{
        public_id:{
            type:String,
            
        },
        url:{
            type:String,
            
        },   
    },
    tags:{
        type:String,
        required:true
    },
    level:{
        type: String,
        required:true,
    },
    demoUrl:{
        type: String,
        required:true,
    },
    benifits: [{title:String}],
    prerequiests: [{title:String}],
    reviews: [reveiwSchema],
    courseData: [couseDataSchema],
    ratings:{
        type:Number,
        default: 0,
    },
    purchased:{
       type: Number,
       default: 0,
    }


},{timestamps:true});

const CourseModel: Model<ICourse> = mongoose.model("Course", courseSchema);

export default CourseModel;