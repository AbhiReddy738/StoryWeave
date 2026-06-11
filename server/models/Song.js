import mongoose from "mongoose";

const songSchema = new mongoose.Schema(
{
    title: {
        type: String,
        required: true
    },

    artistName: {
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

    lyrics: {
        type: String,
        required: true
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

    contributions: [
        {
            author: { type: String },
            text: { type: String },
            upvotes: { type: Number, default: 0 },
            upvotedBy: {
                type: [mongoose.Schema.Types.ObjectId],
                ref: 'user',
                default: []
            },
            createdAt: { type: Date, default: Date.now }
        }
    ],

    slug: {
        type: String,
        unique: true
    },

    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'published'
    }
},
{
    timestamps: true
});

const Song = mongoose.model("Song", songSchema);

export default Song;
