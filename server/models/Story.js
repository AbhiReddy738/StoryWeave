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

    likes:{
        type:Number,
        default:0
    },

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