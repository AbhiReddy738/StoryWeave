import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true
    },

    email:{
        type:String,
        required:true,
        unique:true
    },

    password:{
        type:String,
        required:true
    },

    profileImage:{
        type:String,
        default:""
    },

    authorName:{
        type:String,
        default:""
    },

    interests:{
        type:String,
        default:""
    },

    bio:{
        type:String,
        default:""
    },

    savedStories:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Story"
        }
    ]
});

const User = mongoose.model("user", userSchema);

export default User;