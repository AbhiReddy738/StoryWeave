import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
{
    title: {
        type: String,
        required: true
    },

    genre: {
        type: String,
        required: true
    },

    summary: {
        type: String,
        default: ''
    },

    // Block-based content array: [{type:"text"|"image", value:"..."}]
    // Stored as Mixed to be backward-compatible with old plain-string content.
    content: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },

    coverImage: {
        type: String,
        default: ''
    },

    tags: {
        type: [String],
        default: []
    },

    authorNote: {
        type: String,
        default: ''
    },

    readingTime: {
        type: Number,
        default: 1
    },

    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'published'
    },

    storyType: {
        type: String,
        enum: ['single', 'chapter'],
        default: 'single'
    },

    author: {
        type: String,
        required: true
    },

    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },

    // Numeric cache kept for fast display; source-of-truth is likedBy.length
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
            username: { type: String },
            text: { type: String },
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
    }
},
{
    timestamps: true
});

storySchema.index({ authorId: 1 });
storySchema.index({ genre: 1 });
storySchema.index({ createdAt: -1 });
storySchema.index({ likes: -1 });

const Story = mongoose.model("Story", storySchema);

export default Story;