import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import Story from "../models/Story.js";
import User from "../models/user.js";
import cloudinary from "../config/cloudinary.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Multer (for inline story images): store files in memory so we can stream to Cloudinary
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

// Multer Cloudinary storage for cover images
const coverStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "storyweave/covers",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
    },
});

const uploadCover = multer({
    storage: coverStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only .jpg, .jpeg, .png, and .webp formats are allowed"), false);
        }
    }
});

// Custom middleware to handle Multer validation errors gracefully
const uploadCoverMiddleware = (req, res, next) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(400).json({
            success: false,
            message: "Cloudinary credentials missing"
        });
    }
    const uploadSingle = uploadCover.single("image");
    uploadSingle(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ success: false, message: "Image exceeds 5MB" });
            }
            return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
            let errMsg = err.message;
            if (errMsg.includes("format") || errMsg.includes("allowed")) {
                errMsg = "Invalid image type";
            } else if (errMsg.includes("cloud_name") || errMsg.includes("disabled")) {
                errMsg = "Cloudinary connection failed";
            } else {
                errMsg = "Image upload failed";
            }
            return res.status(400).json({ success: false, message: errMsg });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }
        next();
    });
};

// Multer Cloudinary storage for inline content images
const inlineStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "storyweave/story-images",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
    },
});

const uploadInline = multer({
    storage: inlineStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only .jpg, .jpeg, .png, and .webp formats are allowed"), false);
        }
    }
});

const uploadInlineMiddleware = (req, res, next) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(400).json({
            success: false,
            message: "Cloudinary credentials missing"
        });
    }
    const uploadSingle = uploadInline.single("image");
    uploadSingle(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ success: false, message: "Image exceeds 5MB" });
            }
            return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
            let errMsg = err.message;
            if (errMsg.includes("format") || errMsg.includes("allowed")) {
                errMsg = "Invalid image type";
            } else if (errMsg.includes("cloud_name") || errMsg.includes("disabled")) {
                errMsg = "Cloudinary connection failed";
            } else {
                errMsg = "Image upload failed";
            }
            return res.status(400).json({ success: false, message: errMsg });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }
        next();
    });
};

// Helper: upload a buffer to Cloudinary and return the secure URL (used for inline images legacy/fallback)
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

// Helper to validate stories upon publishing (Issue 1, 5, 7)
const validateStoryPublish = (body) => {
    const { title, genre, summary, content, status } = body;
    if (status === "published") {
        if (!title || !title.trim()) {
            return "Please enter title";
        }
        if (!genre) {
            return "Please enter genre";
        }
        if (!summary || !summary.trim()) {
            return "Please enter summary";
        }
        const contentArray = Array.isArray(content) ? content : [];
        const hasText = contentArray.some(b => b.type === "text" && b.value && b.value.replace(/<[^>]*>/g, "").trim().length > 0);
        const hasImage = contentArray.some(b => b.type === "image" && b.value);
        if (!hasText && !hasImage) {
            return "Please enter content";
        }
    }
    return null;
};

// ─── IMAGE UPLOAD ROUTES ────────────────────────────────────────────────────

// POST /story/upload-cover — upload cover image to Cloudinary (authenticated, validated)
router.post("/upload-cover", authMiddleware, uploadCoverMiddleware, async (req, res) => {
    try {
        console.log(`[DEBUG - SERVER] Cover upload file:`, req.file);
        const url = req.file.path || req.file.secure_url || req.file.url;
        console.log(`[DEBUG - SERVER] Cover uploaded successfully. URL: ${url}`);
        res.status(200).json({ success: true, imageUrl: url });
    } catch (err) {
        console.error(`[DEBUG - SERVER] Cover upload error:`, err);
        res.status(500).json({ success: false, message: "Cover upload failed", error: err.message });
    }
});

// POST /story/upload-image — upload inline story image to Cloudinary (authenticated, validated)
router.post("/upload-image", authMiddleware, uploadInlineMiddleware, async (req, res) => {
    try {
        console.log(`[DEBUG - SERVER] Inline image upload file:`, req.file);
        const url = req.file.path || req.file.secure_url || req.file.url;
        console.log(`[DEBUG - SERVER] Inline image uploaded successfully. URL: ${url}`);
        res.status(200).json({ success: true, imageUrl: url });
    } catch (err) {
        console.error(`[DEBUG - SERVER] Inline image upload error:`, err);
        res.status(500).json({ success: false, message: "Image upload failed", error: err.message });
    }
});

// ─── STORY CRUD ROUTES ──────────────────────────────────────────────────────

// GET /story/all — only published stories (for homepage / trending)
router.get("/all", async (req, res) => {
    try {
        const stories = await Story.find({ status: { $ne: "draft" } })
            .select("title summary coverImage genre likes comments slug author authorId createdAt storyType")
            .sort({ createdAt: -1 });
        res.status(200).json(stories);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /story/trending — retrieve trending stories sorted by likes, comments, and recent activity
router.get("/trending", async (req, res) => {
    try {
        const stories = await Story.find({ status: { $ne: "draft" } })
            .select("title summary coverImage genre likes comments slug author authorId createdAt storyType updatedAt");
        const sorted = stories.sort((a, b) => {
            const scoreA = (a.likes || 0) * 3 + (a.comments?.length || 0) * 2 + new Date(a.updatedAt || a.createdAt).getTime() / (1000 * 60 * 60 * 24);
            const scoreB = (b.likes || 0) * 3 + (b.comments?.length || 0) * 2 + new Date(b.updatedAt || b.createdAt).getTime() / (1000 * 60 * 60 * 24);
            return scoreB - scoreA;
        });
        res.status(200).json(sorted);
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
router.post("/create", authMiddleware, async (req, res) => {
    try {
        console.log(`[DEBUG - SERVER] Story Create Payload:`, req.body);
        const {
            title, genre, summary, content, author,
            coverImage, tags, authorNote, readingTime,
            status, storyType, likes
        } = req.body;

        const authorId = req.user.id; // Enforce authenticated user as author

        // Perform validations if published
        const validationError = validateStoryPublish(req.body);
        if (validationError) {
            console.warn(`[DEBUG - SERVER] Create validation failed: ${validationError}`);
            return res.status(400).json({ message: validationError });
        }

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
        console.log(`[DEBUG - SERVER] Story created successfully. ID: ${saved._id}`);
        res.status(201).json({ message: "Story Created", story: saved });
    } catch (err) {
        console.error(`[DEBUG - SERVER] Story create error:`, err);
        res.status(500).json({ message: err.message || "Server Error" });
    }
});

// PUT /story/update/:id — update story fields (auto-save, edit)
router.put("/update/:id", authMiddleware, async (req, res) => {
    try {
        console.log(`[DEBUG - SERVER] Story Update Payload for ${req.params.id}:`, req.body);
        const story = await Story.findById(req.params.id);
        if (!story) {
            return res.status(404).json({ message: "Story not found" });
        }

        // Verify ownership
        if (story.authorId && story.authorId.toString() !== req.user.id) {
            console.warn(`[DEBUG - SERVER] Unauthorized update attempt on story ${req.params.id} by user ${req.user.id}`);
            return res.status(403).json({ message: "Forbidden: You are not the author of this story" });
        }

        // Perform validations if we are saving/updating as published
        const validationError = validateStoryPublish(req.body);
        if (validationError) {
            console.warn(`[DEBUG - SERVER] Update validation failed: ${validationError}`);
            return res.status(400).json({ message: validationError });
        }

        // Apply updates
        Object.assign(story, req.body);
        const updated = await story.save();
        console.log(`[DEBUG - SERVER] Story updated successfully. ID: ${updated._id}`);
        res.status(200).json({ message: "Story Updated", story: updated });
    } catch (err) {
        console.error(`[DEBUG - SERVER] Story update error:`, err);
        res.status(500).json({ message: err.message || "Server Error" });
    }
});

// PUT /story/:id — update story fields (alias for /update/:id)
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        console.log(`[DEBUG - SERVER] Story Update (alias) Payload for ${req.params.id}:`, req.body);
        const story = await Story.findById(req.params.id);
        if (!story) {
            return res.status(404).json({ message: "Story not found" });
        }

        // Verify ownership
        if (story.authorId && story.authorId.toString() !== req.user.id) {
            console.warn(`[DEBUG - SERVER] Unauthorized update attempt on story ${req.params.id} by user ${req.user.id}`);
            return res.status(403).json({ message: "Forbidden: You are not the author of this story" });
        }

        // Perform validations if we are saving/updating as published
        const validationError = validateStoryPublish(req.body);
        if (validationError) {
            console.warn(`[DEBUG - SERVER] Update validation failed: ${validationError}`);
            return res.status(400).json({ message: validationError });
        }

        // Apply updates
        Object.assign(story, req.body);
        const updated = await story.save();
        console.log(`[DEBUG - SERVER] Story updated (alias) successfully. ID: ${updated._id}`);
        res.status(200).json({ message: "Story Updated", story: updated });
    } catch (err) {
        console.error(`[DEBUG - SERVER] Story update (alias) error:`, err);
        res.status(500).json({ message: err.message || "Server Error" });
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

// DELETE /story/comment/:id/:commentId — Delete comment
router.delete("/comment/:id/:commentId", async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: "Story not found" });
        story.comments = story.comments.filter(c => c._id.toString() !== req.params.commentId);
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
router.post("/save/:id", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
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
router.post("/unsave/:id", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
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
router.get("/saved/:userId", authMiddleware, async (req, res) => {
    try {
        if (req.params.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You cannot access saved stories of another user" });
        }
        const user = await User.findById(req.params.userId).populate("savedStories");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user.savedStories);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /story/is-saved/:storyId/:userId
router.get("/is-saved/:storyId/:userId", authMiddleware, async (req, res) => {
    try {
        if (req.params.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You cannot access saved state of another user" });
        }
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        const isSaved = user.savedStories.includes(req.params.storyId);
        res.status(200).json({ isSaved });
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE /story/delete/:storyId
router.delete("/delete/:storyId", authMiddleware, async (req, res) => {
    try {
        const story = await Story.findById(req.params.storyId);
        if (!story) return res.status(404).json({ message: "Story not found" });

        // Verify ownership
        if (story.authorId && story.authorId.toString() !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You are not authorized to delete this story" });
        }

        await Story.findByIdAndDelete(req.params.storyId);
        res.status(200).json({ message: "Story deleted successfully" });
    } catch (err) {
        res.status(500).json(err);
    }
});

export default router;