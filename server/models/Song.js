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

    views: {
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
            authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
            text: { type: String },
            upvotes: { type: Number, default: 0 },
            upvotedBy: {
                type: [mongoose.Schema.Types.ObjectId],
                ref: 'user',
                default: []
            },
            accepted: { type: Boolean, default: false },
            acceptedAt: { type: Date },
            acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
            status: {
                type: String,
                enum: ['pending', 'accepted', 'rejected'],
                default: 'pending'
            },
            createdAt: { type: Date, default: Date.now }
        }
    ],

    contributors: [
        {
            contributorId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "user",
                required: true
            },
            contributorName: {
                type: String,
                required: true
            },
            profilePhoto: {
                type: String,
                default: ""
            },
            contributionId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Contribution",
                required: true
            },
            contributedText: {
                type: String,
                required: true
            },
            mergedAt: {
                type: Date,
                default: Date.now
            }
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

songSchema.index({ authorId: 1 });
songSchema.index({ genre: 1 });
songSchema.index({ createdAt: -1 });
songSchema.index({ likes: -1 });

const Song = mongoose.model("Song", songSchema);

export default Song;
