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
    ],

    savedSongs:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Song",
            default:[]
        }
    ],

    likedSongs:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Song",
            default:[]
        }
    ],

    uploadedSongs:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Song",
            default:[]
        }
    ],

    profilePhoto: {
        type: String,
        default: ""
    },

    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],

    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],

    totalProfileViews: {
        type: Number,
        default: 0
    },

    profileViews: {
        type: Number,
        default: 0
    },

    followersCount: {
        type: Number,
        default: 0
    },

    followingCount: {
        type: Number,
        default: 0
    },

    readingHistory: [
        {
            contentType: {
                type: String,
                enum: ["story", "song"],
                required: true
            },
            contentId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },
            title: {
                type: String,
                required: true
            },
            slug: {
                type: String,
                required: true
            },
            coverImage: {
                type: String,
                default: ""
            },
            genre: {
                type: String,
                default: ""
            },
            author: {
                type: String,
                default: ""
            },
            viewedAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, {
    timestamps: true
});

const User = mongoose.model("user", userSchema);

export default User;