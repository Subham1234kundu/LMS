require("dotenv").config();
import mongoose,{Document,Model,Schema} from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const emailRechecxPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface IUser extends Document{
    name: string;
    email: string;
    password: string;
    avatar:{
        public_id: string;
        url: string;
    },
    role:string;
    isVeified:boolean;
    courses:Array<{courseId: string}>;
    comparePassword:(password:string) => Promise<boolean>;
    signAcessToken:()=>string;
    signRefreshToken:()=>string
};

const userSchema: Schema <IUser> = new Schema({
    name:{
        type:String,
        required:[true,"Please enter your name"]
    },
    email:{
        type:String,
        required:[true,"Please enter your email"],
        validate:{
            validator: (email: string) => (
                emailRechecxPattern.test(email)
            ),message:"Please enter a valid email"
        },
        unique:true
    },
    password:{
        type:String,
        
        minlength: [6,"Password must be at least 6 characters"],
        select:false
    },
    avatar:{
        public_id:String,
        url:String
    },
    role:{
        type:String,
        default:"user"
    },
    isVeified:{
        type:Boolean,
        default:false
    },
    courses:[
        {
            courseId:String,
        }
    ],
    
},{timestamps:true});

//Hash password before saveing
userSchema.pre<IUser>('save',async function name(next) {
    if(!this.isModified('password')){
        next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
});


//Sign acc ess token
userSchema.methods.signAcessToken =  function(){
    return jwt.sign({id: this._id}, process.env.ACESS_TOKEN || "",{expiresIn:"5m"})
}

//Sign Refresh token
userSchema.methods.signRefreshToken = function(){
    return jwt.sign({id: this._id},process.env.REFRESH_TOKEN || "",{expiresIn:"7d"})
}

//compare password 
userSchema.methods.comparePassword = async function (enterPassword: string): Promise<boolean> {
    return await bcrypt.compare(enterPassword, this.password);
};

const userModel: Model<IUser> = mongoose.model("User",userSchema);
export default userModel;