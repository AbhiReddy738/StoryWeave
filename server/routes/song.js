import express from "express";
import multer from "multer";
import Song from "../models/Song.js";
import User from "../models/user.js";
import cloudinary from "../config/cloudinary.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
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

// Custom middleware to handle Multer validation errors gracefully for songs
const uploadSongCoverMiddleware = (req, res, next) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(400).json({
            success: false,
            message: "Cloudinary credentials missing"
        });
    }
    const uploadSingle = upload.single("image");
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

// ─── COVER UPLOAD ──────────────────────────────────────────────────────────

// POST /song/upload-cover
router.post("/upload-cover", uploadSongCoverMiddleware, async (req, res) => {
    try {
        console.log(`[DEBUG - SERVER] Song cover upload file:`, req.file);
        const url = await uploadToCloudinary(req.file.buffer, "storyweave/song-covers");
        console.log(`[DEBUG - SERVER] Song cover uploaded successfully. URL: ${url}`);
        res.status(200).json({ success: true, imageUrl: url });
    } catch (err) {
        console.error(`[DEBUG - SERVER] Song cover upload error:`, err);
        res.status(500).json({ success: false, message: "Cover upload failed", error: err.message });
    }
});

// ─── CRUD OPERATIONS ──────────────────────────────────────────────────────────

// GET /song/all — Retrieve all songs
router.get("/all", async (req, res) => {
    try {
        const songs = await Song.find({ status: { $ne: "draft" } })
            .select("title artistName genre coverImage summary tags author authorId likes comments contributions slug status createdAt")
            .sort({ createdAt: -1 });
        res.status(200).json(songs);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /song/trending — Retrieve trending songs
router.get("/trending", async (req, res) => {
    try {
        // Sort by likes, comments length, contributions length combined, and recency
        const songs = await Song.find({ status: { $ne: "draft" } })
            .select("title artistName genre coverImage summary tags author authorId likes comments contributions slug status createdAt updatedAt");
        const sorted = songs.sort((a, b) => {
            const scoreA = (a.likes || 0) * 3 + (a.contributions?.length || 0) + (a.comments?.length || 0) * 2 + new Date(a.updatedAt || a.createdAt).getTime() / (1000 * 60 * 60 * 24);
            const scoreB = (b.likes || 0) * 3 + (b.contributions?.length || 0) + (b.comments?.length || 0) * 2 + new Date(b.updatedAt || b.createdAt).getTime() / (1000 * 60 * 60 * 24);
            return scoreB - scoreA;
        });
        res.status(200).json(sorted);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /song/search — Search songs
router.get("/search", async (req, res) => {
    try {
        const q = req.query.q || "";
        const songs = await Song.find({
            status: { $ne: "draft" },
            $or: [
                { title: { $regex: q, $options: "i" } },
                { artistName: { $regex: q, $options: "i" } },
                { genre: { $regex: q, $options: "i" } },
                { tags: { $in: [new RegExp(q, "i")] } }
            ]
        });
        res.status(200).json(songs);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /song/saved/:userId — Retrieve user's saved songs
router.get("/saved/:userId", authMiddleware, async (req, res) => {
    try {
        if (req.params.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You cannot access saved songs of another user" });
        }
        const user = await User.findById(req.params.userId).populate("savedSongs");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user.savedSongs || []);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /song/is-saved/:songId/:userId — Check if saved
router.get("/is-saved/:songId/:userId", authMiddleware, async (req, res) => {
    try {
        if (req.params.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You cannot access saved state of another user" });
        }
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        const isSaved = (user.savedSongs || []).includes(req.params.songId);
        res.status(200).json({ isSaved });
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /song/:id — Retrieve single song
router.get("/:id", async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ message: "Song not found" });

        // Sort contributions by upvotes desc
        if (song.contributions && song.contributions.length > 0) {
            song.contributions.sort((a, b) => b.upvotes - a.upvotes);
        }

        res.status(200).json(song);
    } catch (err) {
        res.status(500).json(err);
    }
});

// POST /song/create — Create song
router.post("/create", authMiddleware, async (req, res) => {
    try {
        const {
            title, artistName, genre, coverImage,
            lyrics, summary, tags, author
        } = req.body;

        const authorId = req.user.id; // Enforce authenticated user as author

        const slug =
            (title || "song")
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .trim()
                .replaceAll(" ", "-")
            + "-" + Date.now();

        const song = new Song({
            title,
            artistName: artistName || "",
            genre,
            coverImage: coverImage || "",
            lyrics: lyrics || "",
            summary: summary || "",
            tags: tags || [],
            author,
            authorId,
            slug
        });

        const savedSong = await song.save();

        // Push to user's uploaded songs array
        await User.findByIdAndUpdate(authorId, {
            $push: { uploadedSongs: savedSong._id }
        });

        res.status(201).json({ message: "Song published successfully", song: savedSong });
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE /song/:id — Delete a song
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ message: "Song not found" });

        // Verify ownership
        if (song.authorId && song.authorId.toString() !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You are not authorized to delete this song" });
        }

        await Song.findByIdAndDelete(req.params.id);

        // Pull from user's uploaded songs
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { uploadedSongs: song._id }
        });

        res.status(200).json({ message: "Song deleted successfully" });
    } catch (err) {
        res.status(500).json(err);
    }
});

// ─── LIKES & SAVES TOGGLES ────────────────────────────────────────────────────

// PUT /song/like/:id — Toggle like
router.put("/like/:id", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ message: "Song not found" });

        const alreadyLiked = song.likedBy.some(id => id.toString() === userId);

        if (alreadyLiked) {
            song.likedBy = song.likedBy.filter(id => id.toString() !== userId);
            await User.findByIdAndUpdate(userId, { $pull: { likedSongs: song._id } });
        } else {
            song.likedBy.push(userId);
            await User.findByIdAndUpdate(userId, { $push: { likedSongs: song._id } });
        }

        song.likes = song.likedBy.length;
        await song.save();

        res.status(200).json({
            likes: song.likes,
            likedBy: song.likedBy,
            liked: !alreadyLiked
        });
    } catch (err) {
        res.status(500).json(err);
    }
});

// PUT /song/save/:id — Toggle save
router.put("/save/:id", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ message: "Song not found" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const alreadySaved = song.savedBy.some(id => id.toString() === userId);

        if (alreadySaved) {
            song.savedBy = song.savedBy.filter(id => id.toString() !== userId);
            user.savedSongs = (user.savedSongs || []).filter(id => id.toString() !== song._id.toString());
        } else {
            song.savedBy.push(userId);
            user.savedSongs.push(song._id);
        }

        await song.save();
        await user.save();

        res.status(200).json({
            message: alreadySaved ? "Song unsaved successfully" : "Song saved successfully",
            savedBy: song.savedBy,
            saved: !alreadySaved
        });
    } catch (err) {
        res.status(500).json(err);
    }
});

// POST /song/save/:id — Add save (mirroring story save)
router.post("/save/:id", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const songId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const song = await Song.findById(songId);
        if (!song) return res.status(404).json({ message: "Song not found" });

        if (!user.savedSongs.includes(songId)) {
            user.savedSongs.push(songId);
            await user.save();
        }

        if (!song.savedBy.some(id => id.toString() === userId)) {
            song.savedBy.push(userId);
            await song.save();
        }

        res.status(200).json({ message: "Song saved successfully", savedSongs: user.savedSongs });
    } catch (err) {
        res.status(500).json(err);
    }
});

// POST /song/unsave/:id — Remove save (mirroring story unsave)
router.post("/unsave/:id", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const songId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const song = await Song.findById(songId);
        if (!song) return res.status(404).json({ message: "Song not found" });

        user.savedSongs = user.savedSongs.filter(id => id.toString() !== songId);
        await user.save();

        song.savedBy = song.savedBy.filter(id => id.toString() !== userId);
        await song.save();

        res.status(200).json({ message: "Song unsaved successfully", savedSongs: user.savedSongs });
    } catch (err) {
        res.status(500).json(err);
    }
});

// ─── COMMENTS ────────────────────────────────────────────────────────────────

// POST /song/comment/:id — Add comment
router.post("/comment/:id", async (req, res) => {
    try {
        const { username, text } = req.body;
        if (!username || !text) return res.status(400).json({ message: "Username and text are required" });

        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ message: "Song not found" });

        song.comments.push({ username, text });
        await song.save();

        res.status(200).json(song);
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE /song/comment/:id/:commentId — Delete comment
router.delete("/comment/:id/:commentId", async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ message: "Song not found" });

        song.comments = song.comments.filter(c => c._id.toString() !== req.params.commentId);
        await song.save();

        res.status(200).json(song);
    } catch (err) {
        res.status(500).json(err);
    }
});

// ─── LYRIC CONTRIBUTIONS ──────────────────────────────────────────────────────

// POST /song/contribution/:id — Add lyric contribution
router.post("/contribution/:id", async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ message: "Song not found" });
        song.contributions.push({ author: req.body.author, text: req.body.text, upvotes: 0 });
        await song.save();
        // Return sorted by upvotes desc
        const sorted = [...song.contributions].sort((a, b) => b.upvotes - a.upvotes);
        res.status(200).json({ ...song.toObject(), contributions: sorted });
    } catch (err) {
        res.status(500).json(err);
    }
});

// PUT /song/contribution/upvote/:songId/:contributionId — toggle upvote
router.put("/contribution/upvote/:songId/:contributionId", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "userId required" });

        const song = await Song.findById(req.params.songId);
        if (!song) return res.status(404).json({ message: "Song not found" });

        const contribution = song.contributions.id(req.params.contributionId);
        if (!contribution) return res.status(404).json({ message: "Contribution not found" });

        const alreadyUpvoted = contribution.upvotedBy.some(id => id.toString() === userId);

        if (alreadyUpvoted) {
            contribution.upvotedBy = contribution.upvotedBy.filter(id => id.toString() !== userId);
            contribution.upvotes = Math.max(0, contribution.upvotes - 1);
        } else {
            contribution.upvotedBy.push(userId);
            contribution.upvotes += 1;
        }

        await song.save();

        // Return contributions sorted by upvotes desc
        const sorted = [...song.contributions].sort((a, b) => b.upvotes - a.upvotes);
        res.status(200).json({
            contributions: sorted,
            upvoted: !alreadyUpvoted,
            contributionId: req.params.contributionId
        });
    } catch (err) {
        res.status(500).json(err);
    }
});

export default router;
