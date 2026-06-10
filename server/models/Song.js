import mongoose from "mongoose";

const songSchema = new mongoose.Schema(
{
    title: {
        type: String,
        required: true
    },

    artist: {
        type: String,
        required: true
    },

    album: {
        type: String,
        default: ""
    },

    genre: {
        type: String,
        required: true
    },

    coverImage: {
        type: String,
        default: ""
    },

    audioUrl: {
        type: String,
        required: true
    },

    lyrics: {
        type: String,
        default: ""
    },

    summary: {
        type: String,
        default: ""
    },

    tags: {
        type: [String],
        default: []
    },

    author: {
        type: String,
        required: true
    },

    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },

    likes: {
        type: Number,
        default: 0
    },

    likedBy: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'user',
        default: []
    },

    savedBy: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'user',
        default: []
    },

    comments: [
        {
            username: { type: String, required: true },
            text: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }
    ],

    plays: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true
});

const Song = mongoose.model("Song", songSchema);

export default Song;
