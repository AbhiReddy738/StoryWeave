import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
{
    title:{
        type:String,
        required:true
    },

    genre:{
        type:String,
        required:true
    },

    summary:{
        type:String,
        required:true
    },

    content:{
        type:String,
        required:true
    },

    author:{
        type:String,
        required:true
    },

    authorId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    },

    likes:{
        type:Number,
        default:0
    },

    comments:[
        {
            username:{
                type:String
            },

            text:{
                type:String
            },

            createdAt:{
                type:Date,
                default:Date.now
            }
        }
    ],

    contributions:[
        {
            author:{
                type:String
            },

            text:{
                type:String
            },

            upvotes:{
                type:Number,
                default:0
            },

            createdAt:{
                type:Date,
                default:Date.now
            }
        }
    ],

    slug:{
        type:String,
        unique:true
    }
},
{
    timestamps:true
});

const Story = mongoose.model("Story", storySchema);

export default Story;