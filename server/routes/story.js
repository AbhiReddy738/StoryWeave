import express from "express";
import multer from "multer";
import Story from "../models/Story.js";
import User from "../models/user.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// Multer: store files in memory so we can stream to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"), false);
        }
    }
});

// Helper: upload a buffer to Cloudinary and return the secure URL
const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: "image" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

// ─── IMAGE UPLOAD ROUTES ────────────────────────────────────────────────────

// POST /story/upload-cover — upload cover image to Cloudinary
router.post("/upload-cover", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided" });
        }
        const url = await uploadToCloudinary(req.file.buffer, "storyweave/covers");
        res.status(200).json({ url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Cover upload failed", error: err.message });
    }
});

// POST /story/upload-image — upload inline story image to Cloudinary
router.post("/upload-image", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided" });
        }
        const url = await uploadToCloudinary(req.file.buffer, "storyweave/story-images");
        res.status(200).json({ url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Image upload failed", error: err.message });
    }
});

// ─── STORY CRUD ROUTES ──────────────────────────────────────────────────────

// GET /story/all — only published stories (for homepage / trending)
router.get("/all", async (req, res) => {
    try {
        const stories = await Story.find({ status: "published" }).sort({ createdAt: -1 });
        res.status(200).json(stories);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /story/drafts/:authorId — author's own drafts
router.get("/drafts/:authorId", async (req, res) => {
    try {
        const stories = await Story.find({
            authorId: req.params.authorId,
            status: "draft"
        }).sort({ updatedAt: -1 });
        res.status(200).json(stories);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /story/:id — single story by ID
router.get("/:id", async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) {
            return res.status(404).json({ message: "Story not found" });
        }
        if (story.contributions && story.contributions.length > 0) {
            story.contributions.sort((a, b) => b.upvotes - a.upvotes);
        }
        res.status(200).json(story);
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

// POST /story/create — create a new story (draft or published)
router.post("/create", async (req, res) => {
    try {
        const {
            title, genre, summary, content, author, authorId,
            coverImage, tags, authorNote, readingTime,
            status, storyType, likes
        } = req.body;

        const slug =
            (title || "story")
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .trim()
                .replaceAll(" ", "-")
            + "-" + Date.now();

        const story = new Story({
            title, genre, summary, content, author, authorId,
            coverImage: coverImage || "",
            tags: tags || [],
            authorNote: authorNote || "",
            readingTime: readingTime || 1,
            status: status || "published",
            storyType: storyType || "single",
            likes: likes || 0,
            slug
        });

        const saved = await story.save();

        res.status(201).json({ message: "Story Created", story: saved });
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// PUT /story/update/:id — update story fields (auto-save, edit)
router.put("/update/:id", async (req, res) => {
    try {
        const story = await Story.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        if (!story) {
            return res.status(404).json({ message: "Story not found" });
        }
        res.status(200).json({ message: "Story Updated", story });
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// PUT /story/like/:id — toggle like (one per user)
router.put("/like/:id", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "userId required" });

        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: "Story not found" });

        const alreadyLiked = story.likedBy.some(id => id.toString() === userId);

        if (alreadyLiked) {
            story.likedBy = story.likedBy.filter(id => id.toString() !== userId);
        } else {
            story.likedBy.push(userId);
        }

        story.likes = story.likedBy.length;
        await story.save();

        res.status(200).json({
            likes: story.likes,
            likedBy: story.likedBy,
            liked: !alreadyLiked
        });
    } catch (err) {
        res.status(500).json(err);
    }
});

// POST /story/comment/:id
router.post("/comment/:id", async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: "Story not found" });
        story.comments.push({ username: req.body.username, text: req.body.text });
        await story.save();
        res.status(200).json(story);
    } catch (err) {
        res.status(500).json(err);
    }
});

// POST /story/contribution/:id
router.post("/contribution/:id", async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: "Story not found" });
        story.contributions.push({ author: req.body.author, text: req.body.text, upvotes: 0 });
        await story.save();
        // Return sorted by upvotes desc
        const sorted = [...story.contributions].sort((a, b) => b.upvotes - a.upvotes);
        res.status(200).json({ ...story.toObject(), contributions: sorted });
    } catch (err) {
        res.status(500).json(err);
    }
});

// PUT /story/contribution/upvote/:storyId/:contributionId — toggle upvote (one per user)
router.put("/contribution/upvote/:storyId/:contributionId", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "userId required" });

        const story = await Story.findById(req.params.storyId);
        if (!story) return res.status(404).json({ message: "Story not found" });

        const contribution = story.contributions.id(req.params.contributionId);
        if (!contribution) return res.status(404).json({ message: "Contribution not found" });

        const alreadyUpvoted = contribution.upvotedBy.some(id => id.toString() === userId);

        if (alreadyUpvoted) {
            contribution.upvotedBy = contribution.upvotedBy.filter(id => id.toString() !== userId);
            contribution.upvotes = Math.max(0, contribution.upvotes - 1);
        } else {
            contribution.upvotedBy.push(userId);
            contribution.upvotes += 1;
        }

        await story.save();

        // Return contributions sorted by upvotes desc
        const sorted = [...story.contributions].sort((a, b) => b.upvotes - a.upvotes);
        res.status(200).json({
            contributions: sorted,
            upvoted: !alreadyUpvoted,
            contributionId: req.params.contributionId
        });
    } catch (err) {
        res.status(500).json(err);
    }
});

// POST /story/save/:id
router.post("/save/:id", async (req, res) => {
    try {
        const { userId } = req.body;
        const storyId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const story = await Story.findById(storyId);
        if (!story) return res.status(404).json({ message: "Story not found" });

        if (!user.savedStories.includes(storyId)) {
            user.savedStories.push(storyId);
            await user.save();
        }

        if (!story.savedBy.some(id => id.toString() === userId)) {
            story.savedBy.push(userId);
            await story.save();
        }

        res.status(200).json({ message: "Story saved successfully", savedStories: user.savedStories });
    } catch (err) {
        res.status(500).json(err);
    }
});

// POST /story/unsave/:id
router.post("/unsave/:id", async (req, res) => {
    try {
        const { userId } = req.body;
        const storyId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const story = await Story.findById(storyId);
        if (!story) return res.status(404).json({ message: "Story not found" });

        user.savedStories = user.savedStories.filter(id => id.toString() !== storyId);
        await user.save();

        story.savedBy = story.savedBy.filter(id => id.toString() !== userId);
        await story.save();

        res.status(200).json({ message: "Story unsaved successfully", savedStories: user.savedStories });
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /story/saved/:userId
router.get("/saved/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate("savedStories");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user.savedStories);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /story/is-saved/:storyId/:userId
router.get("/is-saved/:storyId/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        const isSaved = user.savedStories.includes(req.params.storyId);
        res.status(200).json({ isSaved });
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE /story/delete/:storyId
router.delete("/delete/:storyId", async (req, res) => {
    try {
        const story = await Story.findByIdAndDelete(req.params.storyId);
        if (!story) return res.status(404).json({ message: "Story not found" });
        res.status(200).json({ message: "Story deleted successfully" });
    } catch (err) {
        res.status(500).json(err);
    }
});

export default router;