import mongoose from "mongoose";

const storyVersionSchema = new mongoose.Schema({
    storyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
        required: true
    },
    versionNumber: {
        type: Number,
        required: true
    },
    oldContent: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
}, {
    timestamps: true
});

const StoryVersion = mongoose.model("StoryVersion", storyVersionSchema);

export default StoryVersion;
