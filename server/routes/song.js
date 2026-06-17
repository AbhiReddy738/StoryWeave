import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import multer from "multer";
import Song from "../models/Song.js";
import User from "../models/user.js";
import Notification from "../models/Notification.js";
import cloudinary from "../config/cloudinary.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Helper: Find song by ID or slug (Issue 1)
const findSongByIdOrSlug = async (param) => {
    if (mongoose.Types.ObjectId.isValid(param)) {
        const song = await Song.findById(param);
        if (song) return song;
    }
    return await Song.findOne({ slug: param });
};

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

// GET /song/:id — Retrieve single song by ID or slug
router.get("/:id", async (req, res) => {
    const requestedId = req.params.id;
    try {
        let song = null;
        // 1. Check if exact slug match
        song = await Song.findOne({ slug: requestedId });

        // 2. Check if valid ObjectId and search by ID
        if (!song && mongoose.Types.ObjectId.isValid(requestedId)) {
            song = await Song.findById(requestedId);
        }

        // 3. Try to extract ObjectId from end of slug (legacy support)
        if (!song && requestedId) {
            const hex24Regex = /[0-9a-fA-F]{24}$/;
            const match = requestedId.match(hex24Regex);
            if (match) {
                const extractedId = match[0];
                if (mongoose.Types.ObjectId.isValid(extractedId)) {
                    song = await Song.findById(extractedId);
                }
            }
        }

        if (!song) return res.status(404).json({ message: "Song not found" });

        // Increment views count
        song.views = (song.views || 0) + 1;
        await song.save();

        // Sort contributions by upvotes desc
        if (song.contributions && song.contributions.length > 0) {
            song.contributions.sort((a, b) => b.upvotes - a.upvotes);
        }

        res.status(200).json(song);
    } catch (err) {
        console.error("[DEBUG - SERVER] Error in GET /song/:id:", err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});

// POST /song/create — Create song
router.post("/create", authMiddleware, async (req, res) => {
    try {
        const {
            title, artistName, genre, coverImage,
            lyrics, summary, tags, author, status
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
            slug,
            status: status || "published"
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

// PUT /song/:id — Update song fields (edit lyrics)
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ message: "Song not found" });
        }

        // Verify ownership
        if (song.authorId && song.authorId.toString() !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You are not authorized to edit this song" });
        }

        // Apply updates
        Object.assign(song, req.body);
        
        // Regenerate slug if title is updated
        if (req.body.title) {
            song.slug = req.body.title
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .trim()
                .replaceAll(" ", "-")
                + "-" + Date.now();
        }

        const updated = await song.save();
        res.status(200).json({ message: "Song updated successfully", song: updated });
    } catch (err) {
        console.error("[DEBUG - SERVER] Song update error:", err);
        res.status(500).json({ message: err.message || "Server Error" });
    }
});

// PUT /song/update/:id — Update song fields (alias)
router.put("/update/:id", authMiddleware, async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ message: "Song not found" });
        }

        // Verify ownership
        if (song.authorId && song.authorId.toString() !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You are not authorized to edit this song" });
        }

        // Apply updates
        Object.assign(song, req.body);
        
        // Regenerate slug if title is updated
        if (req.body.title) {
            song.slug = req.body.title
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .trim()
                .replaceAll(" ", "-")
                + "-" + Date.now();
        }

        const updated = await song.save();
        res.status(200).json({ message: "Song updated successfully", song: updated });
    } catch (err) {
        console.error("[DEBUG - SERVER] Song update alias error:", err);
        res.status(500).json({ message: err.message || "Server Error" });
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

// POST /song/contribution/:id — Add lyric contribution (compatibility route)
router.post("/contribution/:id", authMiddleware, async (req, res) => {
    try {
        const song = await findSongByIdOrSlug(req.params.id);
        if (!song) return res.status(404).json({ message: "Song not found" });

        const contributor = await User.findById(req.user.id);
        if (!contributor) return res.status(404).json({ message: "User not found" });

        const newContrib = {
            author: contributor.username,
            authorId: contributor._id,
            text: req.body.text,
            upvotes: 0,
            upvotedBy: [],
            accepted: false,
            status: "pending",
            createdAt: new Date()
        };

        song.contributions.push(newContrib);
        await song.save();

        if (song.authorId) {
            const notification = new Notification({
                recipient: song.authorId,
                sender: req.user.id,
                type: "contribution_submitted",
                message: `${contributor.username} submitted a continuation for your lyrics "${song.title}"`
            });
            await notification.save();
        }

        const sorted = [...song.contributions].sort((a, b) => b.upvotes - a.upvotes);
        res.status(200).json({ ...song.toObject(), contributions: sorted });
    } catch (err) {
        res.status(500).json(err);
    }
});

// POST /song/:songId/contribute — Submit a lyric contribution (authenticated)
router.post("/:songId/contribute", authMiddleware, async (req, res) => {
    try {
        const { songId } = req.params;
        const { text, contributedText } = req.body;
        const contribText = (text || contributedText || "").trim();

        if (!contribText) {
            return res.status(400).json({ success: false, message: "Contributed text is required" });
        }

        const song = await findSongByIdOrSlug(songId);
        if (!song) {
            return res.status(404).json({ success: false, message: "Song not found" });
        }

        // Check if author is trying to contribute to their own song
        if (song.authorId && song.authorId.toString() === req.user.id) {
            return res.status(400).json({ success: false, message: "Lyrics authors cannot contribute to their own lyrics" });
        }

        const contributor = await User.findById(req.user.id);
        if (!contributor) {
            return res.status(404).json({ success: false, message: "Contributor user not found" });
        }

        const newContrib = {
            author: contributor.username,
            authorId: contributor._id,
            text: contribText,
            upvotes: 0,
            upvotedBy: [],
            accepted: false,
            status: "pending",
            createdAt: new Date()
        };

        song.contributions.push(newContrib);
        await song.save();

        const savedContrib = song.contributions[song.contributions.length - 1];

        // Notify the song author
        if (song.authorId) {
            const notification = new Notification({
                recipient: song.authorId,
                sender: req.user.id,
                type: "contribution_submitted",
                message: `${contributor.username} submitted a continuation for your lyrics "${song.title}"`
            });
            await notification.save();
        }

        res.status(201).json({ success: true, contribution: savedContrib });
    } catch (err) {
        console.error("Error in POST /:songId/contribute:", err);
        res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
});

// GET /song/:songId/contributions — Get filtered song contributions
router.get("/:songId/contributions", async (req, res) => {
    try {
        const { songId } = req.params;
        const song = await findSongByIdOrSlug(songId);
        if (!song) {
            return res.status(404).json({ success: false, message: "Song not found" });
        }

        // Resolve contributions authorId for avatars
        await song.populate("contributions.authorId", "username profilePhoto profileImage");

        // Get visitor ID if logged in
        const authHeader = req.headers.authorization;
        let visitorId = null;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "storyweave_secret_key_123");
                visitorId = decoded.id;
            } catch (e) {
                // Ignore
            }
        }

        const isOwner = song.authorId && visitorId && song.authorId.toString() === visitorId.toString();

        const mapped = song.contributions.map(c => {
            const authorUser = c.authorId || {};
            return {
                _id: c._id,
                author: c.author || authorUser.username || "Unknown",
                authorId: authorUser._id || c.authorId,
                contributorName: c.author || authorUser.username || "Unknown",
                contributorId: authorUser._id || c.authorId,
                contributorProfileImage: authorUser.profilePhoto || authorUser.profileImage || "",
                text: c.text,
                contributedText: c.text,
                upvotes: c.upvotes || 0,
                upvotedBy: c.upvotedBy || [],
                accepted: c.accepted || false,
                status: c.accepted ? "accepted" : (c.status || "pending"),
                createdAt: c.createdAt
            };
        });

        // Filter based on roles (Accepted visible to all, pending/rejected only to owner & contributor)
        const filtered = mapped.filter(c => {
            if (c.status === "accepted" || c.accepted) return true;
            if (visitorId && (isOwner || c.contributorId?.toString() === visitorId.toString())) return true;
            return false;
        });

        // Sort: accepted first, then upvotes DESC, then createdAt DESC
        filtered.sort((a, b) => {
            if (a.accepted && !b.accepted) return -1;
            if (!a.accepted && b.accepted) return 1;
            if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.status(200).json(filtered);
    } catch (err) {
        console.error("Error in GET contributions:", err);
        res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
});

// PUT /song/contribution/upvote/:songId/:contributionId — toggle upvote
router.put("/contribution/upvote/:songId/:contributionId", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const song = await findSongByIdOrSlug(req.params.songId);
        if (!song) return res.status(404).json({ message: "Song not found" });

        const contribution = song.contributions.id(req.params.contributionId);
        if (!contribution) return res.status(404).json({ message: "Contribution not found" });

        if (!contribution.upvotedBy) {
            contribution.upvotedBy = [];
        }

        const alreadyUpvoted = contribution.upvotedBy.some(id => id.toString() === userId.toString());

        if (alreadyUpvoted) {
            contribution.upvotedBy = contribution.upvotedBy.filter(id => id.toString() !== userId.toString());
        } else {
            contribution.upvotedBy.push(userId);
        }

        contribution.upvotes = contribution.upvotedBy.length;
        await song.save();

        const sorted = [...song.contributions].sort((a, b) => b.upvotes - a.upvotes);
        res.status(200).json({
            contributions: sorted,
            upvoted: !alreadyUpvoted,
            contributionId: req.params.contributionId
        });
    } catch (err) {
        console.error("Error in upvote song contribution:", err);
        res.status(500).json({ message: err.message });
    }
});

// POST /song/:songId/contribution/:contributionId/accept — Accept contribution and optionally append to lyrics
router.post("/:songId/contribution/:contributionId/accept", authMiddleware, async (req, res) => {
    try {
        const { songId, contributionId } = req.params;
        const { append } = req.body;

        const song = await findSongByIdOrSlug(songId);
        if (!song) {
            return res.status(404).json({ success: false, message: "Song not found" });
        }

        // Verify ownership
        if (!song.authorId || song.authorId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "Forbidden: Only the lyrics author can accept contributions" });
        }

        const contribution = song.contributions.id(contributionId);
        if (!contribution) {
            return res.status(404).json({ success: false, message: "Contribution not found" });
        }

        contribution.status = "accepted";
        contribution.accepted = true;
        contribution.acceptedAt = new Date();
        contribution.acceptedBy = req.user.id;

        if (append) {
            song.lyrics = song.lyrics + "\n\n" + contribution.text;
        }

        // Add to contributors list
        const contributorUser = await User.findById(contribution.authorId);
        const exists = song.contributors.some(c => c.contributionId?.toString() === contributionId.toString());
        if (!exists) {
            song.contributors.push({
                contributorId: contribution.authorId,
                contributorName: contribution.author || contributorUser?.username || "Unknown",
                profilePhoto: contributorUser?.profilePhoto || contributorUser?.profileImage || "",
                contributionId: contribution._id,
                contributedText: contribution.text,
                mergedAt: new Date()
            });
        }

        await song.save();

        // Notify contributor
        if (contribution.authorId) {
            try {
                const notification = new Notification({
                    recipient: contribution.authorId,
                    sender: req.user.id,
                    type: "contribution_accepted",
                    message: `Your lyric contribution was accepted for "${song.title}"!`
                });
                await notification.save();
            } catch (notifyErr) {
                console.warn("Notification failed to send:", notifyErr.message);
            }
        }

        const updatedSong = await Song.findById(song._id).populate("contributions.authorId", "username profilePhoto profileImage");
        res.status(200).json({ success: true, song: updatedSong, contribution });
    } catch (err) {
        console.error("Error in accept lyrics contribution:", err);
        res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
});

// PUT /song/:songId/contributions/:contributionId/status — Moderate status (Accept/Reject)
router.put("/:songId/contributions/:contributionId/status", authMiddleware, async (req, res) => {
    try {
        const { songId, contributionId } = req.params;
        const { status } = req.body;

        if (!["accepted", "rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const song = await findSongByIdOrSlug(songId);
        if (!song) {
            return res.status(404).json({ success: false, message: "Song not found" });
        }

        if (!song.authorId || song.authorId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "Forbidden: Only the song author can moderate" });
        }

        const contribution = song.contributions.id(contributionId);
        if (!contribution) {
            return res.status(404).json({ success: false, message: "Contribution not found" });
        }

        contribution.status = status;
        if (status === "accepted") {
            contribution.accepted = true;
            contribution.acceptedAt = new Date();
            contribution.acceptedBy = req.user.id;
        } else {
            contribution.accepted = false;
        }

        await song.save();

        if (contribution.authorId) {
            const notification = new Notification({
                recipient: contribution.authorId,
                sender: req.user.id,
                type: `contribution_${status}`,
                message: `Your lyric contribution for "${song.title}" was ${status}.`
            });
            await notification.save();
        }

        res.status(200).json({ success: true, contribution });
    } catch (err) {
        console.error("Error in moderate lyrics status:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

export default router;
