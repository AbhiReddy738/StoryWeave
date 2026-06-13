import mongoose from "mongoose";

const contributionSchema = new mongoose.Schema({
    storyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
        required: true
    },
    contributorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    contributorName: {
        type: String,
        required: true
    },
    contributorProfileImage: {
        type: String,
        default: ""
    },
    contributedText: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
    },
    mergedIntoStory: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Contribution = mongoose.model("Contribution", contributionSchema);

export default Contribution;
