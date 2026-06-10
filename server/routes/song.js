import express from "express";
import multer from "multer";
import Song from "../models/Song.js";
import User from "../models/user.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 30 * 1024 * 1024 } // Allow up to 30 MB for audio
});

// Helper to stream file buffers to Cloudinary
const uploadToCloudinary = (buffer, folder, resourceType = "auto") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: resourceType },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

// ─── AUDIO & COVER UPLOADS ───────────────────────────────────────────────────

// POST /song/upload-cover
router.post("/upload-cover", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided" });
        }
        const url = await uploadToCloudinary(req.file.buffer, "storyweave/song-covers", "image");
        res.status(200).json({ url });
    } catch (err) {
        res.status(500).json({ message: "Cover upload failed", error: err.message });
    }
});

// POST /song/upload-audio
router.post("/upload-audio", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No audio file provided" });
        }
        const url = await uploadToCloudinary(req.file.buffer, "storyweave/song-audio", "auto");
        res.status(200).json({ url });
    } catch (err) {
        res.status(500).json({ message: "Audio upload failed", error: err.message });
    }
});

// ─── CRUD OPERATIONS ──────────────────────────────────────────────────────────

// GET /song/all — Retrieve all songs
router.get("/all", async (req, res) => {
    try {
        const songs = await Song.find().sort({ createdAt: -1 });
        res.status(200).json(songs);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /song/trending — Retrieve trending songs
router.get("/trending", async (req, res) => {
    try {
        // Sort by plays, likes, and comments length combined
        const songs = await Song.find();
        const sorted = songs.sort((a, b) => {
            const scoreA = (a.likes || 0) * 3 + (a.plays || 0) + (a.comments?.length || 0) * 2;
            const scoreB = (b.likes || 0) * 3 + (b.plays || 0) + (b.comments?.length || 0) * 2;
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
            $or: [
                { title: { $regex: q, $options: "i" } },
                { artist: { $regex: q, $options: "i" } },
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
router.get("/saved/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate("savedSongs");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user.savedSongs || []);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /song/is-saved/:songId/:userId — Check if saved
router.get("/is-saved/:songId/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        const isSaved = (user.savedSongs || []).includes(req.params.songId);
        res.status(200).json({ isSaved });
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET /song/:id — Retrieve single song and increment plays
router.get("/:id", async (req, res) => {
    try {
        const song = await Song.findByIdAndUpdate(
            req.params.id,
            { $inc: { plays: 1 } },
            { new: true }
        );
        if (!song) return res.status(404).json({ message: "Song not found" });
        res.status(200).json(song);
    } catch (err) {
        res.status(500).json(err);
    }
});

// POST /song/create — Create song
router.post("/create", async (req, res) => {
    try {
        const {
            title, artist, album, genre, coverImage, audioUrl,
            lyrics, summary, tags, author, authorId
        } = req.body;

        const song = new Song({
            title,
            artist,
            album: album || "",
            genre,
            coverImage: coverImage || "",
            audioUrl,
            lyrics: lyrics || "",
            summary: summary || "",
            tags: tags || [],
            author,
            authorId
        });

        const savedSong = await song.save();

        // Push to user's uploaded songs array if logged in
        if (authorId) {
            await User.findByIdAndUpdate(authorId, {
                $push: { uploadedSongs: savedSong._id }
            });
        }

        res.status(201).json({ message: "Song published successfully", song: savedSong });
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE /song/:id — Delete a song
router.delete("/:id", async (req, res) => {
    try {
        const song = await Song.findByIdAndDelete(req.params.id);
        if (!song) return res.status(404).json({ message: "Song not found" });

        // Pull from user's uploaded songs
        if (song.authorId) {
            await User.findByIdAndUpdate(song.authorId, {
                $pull: { uploadedSongs: song._id }
            });
        }

        res.status(200).json({ message: "Song deleted successfully" });
    } catch (err) {
        res.status(500).json(err);
    }
});

// ─── LIKES & SAVES TOGGLES ────────────────────────────────────────────────────

// PUT /song/like/:id — Toggle like
router.put("/like/:id", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "userId required" });

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
router.put("/save/:id", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "userId required" });

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

export default router;
