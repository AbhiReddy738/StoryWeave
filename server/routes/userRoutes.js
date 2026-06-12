import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import User from "../models/user.js";
import Story from "../models/Story.js";
import Song from "../models/Song.js";
import Notification from "../models/Notification.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

import cloudinary from "../config/cloudinary.js";

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

// GET user profile
router.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            authorName: user.authorName || "",
            interests: user.interests || "",
            bio: user.bio || "",
            profileImage: user.profileImage || user.profilePhoto || "",
            followersCount: user.followersCount || user.followers?.length || 0,
            followingCount: user.followingCount || user.following?.length || 0,
            followers: user.followers || [],
            following: user.following || []
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT update user profile
router.put("/update/:id", authMiddleware, async (req, res) => {
    try {
        if (req.params.id !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You are not authorized to update this profile" });
        }
        const { username, authorName, interests, bio, profileImage } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.username = username !== undefined ? username : user.username;
        user.authorName = authorName !== undefined ? authorName : user.authorName;
        user.interests = interests !== undefined ? interests : user.interests;
        user.bio = bio !== undefined ? bio : user.bio;
        if (profileImage !== undefined) {
            user.profileImage = profileImage;
        }

        await user.save();

        res.status(200).json({
            message: "Profile Updated Successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                authorName: user.authorName,
                interests: user.interests,
                bio: user.bio,
                profileImage: user.profileImage
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST upload profile photo
router.post("/upload", authMiddleware, (req, res, next) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(400).json({
            success: false,
            message: "Cloudinary credentials missing"
        });
    }
    const uploadSingle = upload.single("profileImage");
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
}, async (req, res) => {
    try {
        console.log(`[DEBUG - SERVER] User profile upload file:`, req.file);
        const url = await uploadToCloudinary(req.file.buffer, "storyweave/profiles");
        console.log(`[DEBUG - SERVER] User profile uploaded successfully. URL: ${url}`);
        res.status(200).json({ url });
    } catch (err) {
        console.error(`[DEBUG - SERVER] User profile upload error:`, err);
        res.status(500).json({ message: "Image upload failed", error: err.message });
    }
});

// GET stories by user ID
router.get("/posts/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Find stories where authorId matches userId OR author matches the user's authorName or username (backward compatibility)
        const stories = await Story.find({
            $or: [
                { authorId: user._id },
                { author: user.authorName },
                { author: user.username }
            ]
        }).select("title summary coverImage genre likes comments slug author authorId createdAt storyType");
        
        res.status(200).json(stories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET songs by user ID
router.get("/songs/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Find songs where authorId matches userId OR author matches the user's authorName or username (backward compatibility)
        const songs = await Song.find({
            $or: [
                { authorId: user._id },
                { author: user.authorName },
                { author: user.username }
            ]
        })
        .select("title artistName genre coverImage summary tags author authorId likes comments contributions slug status createdAt")
        .sort({ createdAt: -1 });
        
        res.status(200).json(songs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET author profile (by ID or username)
router.get("/profile/:id", async (req, res) => {
    try {
        let user;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            user = await User.findById(req.params.id);
        } else {
            user = await User.findOne({ username: req.params.id });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Increment profile views if visitor is not profile owner or anonymous
        const authHeader = req.headers.authorization;
        let visitorId = null;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "storyweave_secret_key_123");
                visitorId = decoded.id;
            } catch (e) {
                // Invalid token, ignore
            }
        }

        if (!visitorId || visitorId !== user._id.toString()) {
            user.totalProfileViews = (user.totalProfileViews || 0) + 1;
            user.profileViews = (user.profileViews || 0) + 1;
            await user.save();
        }

        // Calculate dynamic stats
        const totalStories = await Story.countDocuments({ authorId: user._id, status: "published" });
        const userStories = await Story.find({ authorId: user._id, status: "published" });
        const totalStoryLikes = userStories.reduce((sum, s) => sum + (s.likes || 0), 0);

        const totalSongs = await Song.countDocuments({ authorId: user._id, status: "published" });
        const userSongs = await Song.find({ authorId: user._id, status: "published" });
        const totalSongLikes = userSongs.reduce((sum, s) => sum + (s.likes || 0), 0);

        const totalLikesReceived = totalStoryLikes + totalSongLikes;

        // Count contributions
        const allStoriesWithContribs = await Story.find({ "contributions.author": user.username });
        let storyContribsCount = 0;
        allStoriesWithContribs.forEach(s => {
            s.contributions.forEach(c => {
                if (c.author === user.username) storyContribsCount++;
            });
        });

        const allSongsWithContribs = await Song.find({ "contributions.author": user.username });
        let songContribsCount = 0;
        allSongsWithContribs.forEach(s => {
            s.contributions.forEach(c => {
                if (c.author === user.username) songContribsCount++;
            });
        });
        const totalContributions = storyContribsCount + songContribsCount;

        // Count comments
        const allStoriesWithComments = await Story.find({ "comments.username": user.username });
        let storyCommentsCount = 0;
        allStoriesWithComments.forEach(s => {
            s.comments.forEach(c => {
                if (c.username === user.username) storyCommentsCount++;
            });
        });

        const allSongsWithComments = await Song.find({ "comments.username": user.username });
        let songCommentsCount = 0;
        allSongsWithComments.forEach(s => {
            s.comments.forEach(c => {
                if (c.username === user.username) songCommentsCount++;
            });
        });
        const totalComments = storyCommentsCount + songCommentsCount;

        // Calculate similar authors (matching genres, tags, or most liked stories)
        const targetStories = await Story.find({ authorId: user._id, status: "published" });
        const genres = [...new Set(targetStories.map(s => s.genre).filter(Boolean))];
        const tags = [...new Set(targetStories.flatMap(s => s.tags || []).filter(Boolean))];

        const otherStories = await Story.find({
            authorId: { $ne: user._id },
            status: "published",
            $or: [
                { genre: { $in: genres } },
                { tags: { $in: tags } }
            ]
        });

        const authorScores = {};
        otherStories.forEach(s => {
            if (!s.authorId) return;
            const aid = s.authorId.toString();
            if (!authorScores[aid]) {
                authorScores[aid] = { authorId: s.authorId, score: 0 };
            }
            if (genres.includes(s.genre)) authorScores[aid].score += 5;
            const matchTags = (s.tags || []).filter(t => tags.includes(t)).length;
            authorScores[aid].score += matchTags * 2;
            authorScores[aid].score += (s.likes || 0) * 0.1;
        });

        let sortedScores = Object.values(authorScores).sort((a, b) => b.score - a.score);

        const matchedIds = sortedScores.map(x => x.authorId.toString());
        if (matchedIds.length < 4) {
            const fallbackStories = await Story.find({
                authorId: { $ne: user._id, $nin: matchedIds },
                status: "published"
            });
            const fallbackScores = {};
            fallbackStories.forEach(s => {
                if (!s.authorId) return;
                const aid = s.authorId.toString();
                if (!fallbackScores[aid]) {
                    fallbackScores[aid] = { authorId: s.authorId, score: 0 };
                }
                fallbackScores[aid].score += (s.likes || 0) * 0.1;
            });
            const sortedFallback = Object.values(fallbackScores).sort((a, b) => b.score - a.score);
            sortedScores = [...sortedScores, ...sortedFallback];
        }

        const top4 = sortedScores.slice(0, 4);
        const similarAuthors = [];
        for (const candidate of top4) {
            const u = await User.findById(candidate.authorId);
            if (u) {
                similarAuthors.push({
                    _id: u._id,
                    username: u.username,
                    bio: u.bio || "",
                    profilePhoto: u.profilePhoto || u.profileImage || "",
                    followersCount: u.followers?.length || 0
                });
            }
        }

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            bio: user.bio || "",
            profilePhoto: user.profilePhoto || user.profileImage || "",
            followers: user.followers || [],
            following: user.following || [],
            followersCount: user.followersCount || user.followers?.length || 0,
            followingCount: user.followingCount || user.following?.length || 0,
            totalProfileViews: user.totalProfileViews || 0,
            profileViews: user.profileViews || user.totalProfileViews || 0,
            createdAt: user.createdAt || user._id.getTimestamp(),
            stats: {
                totalStories,
                totalSongs,
                totalStoryLikes,
                totalSongLikes,
                totalContributions,
                totalComments,
                totalLikesReceived
            },
            similarAuthors
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET user stories (by user ID or username)
router.get("/stories/:id", async (req, res) => {
    try {
        let user;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            user = await User.findById(req.params.id);
        } else {
            user = await User.findOne({ username: req.params.id });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const stories = await Story.find({
            $or: [
                { authorId: user._id },
                { author: user.authorName },
                { author: user.username }
            ],
            status: "published"
        })
            .select("title summary coverImage genre likes comments slug author authorId createdAt storyType")
            .sort({ createdAt: -1 });
        res.status(200).json(stories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET user songs (by user ID or username)
router.get("/songs/:id", async (req, res) => {
    try {
        let user;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            user = await User.findById(req.params.id);
        } else {
            user = await User.findOne({ username: req.params.id });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const songs = await Song.find({
            $or: [
                { authorId: user._id },
                { author: user.authorName },
                { author: user.username }
            ],
            status: "published"
        })
            .select("title artistName genre coverImage summary tags author authorId likes comments contributions slug status createdAt")
            .sort({ createdAt: -1 });
        res.status(200).json(songs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET user contributions (by user ID or username)
router.get("/contributions/:id", async (req, res) => {
    try {
        let user;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            user = await User.findById(req.params.id);
        } else {
            user = await User.findOne({ username: req.params.id });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userContribs = [];
        
        // Stories
        const stories = await Story.find({ "contributions.author": user.username });
        stories.forEach(s => {
            s.contributions.forEach(c => {
                if (c.author === user.username) {
                    userContribs.push({
                        _id: c._id,
                        type: "story",
                        parentTitle: s.title,
                        parentId: s._id,
                        parentSlug: s.slug,
                        text: c.text,
                        upvotes: c.upvotes,
                        createdAt: c.createdAt
                    });
                }
            });
        });

        // Songs
        const songs = await Song.find({ "contributions.author": user.username });
        songs.forEach(s => {
            s.contributions.forEach(c => {
                if (c.author === user.username) {
                    userContribs.push({
                        _id: c._id,
                        type: "song",
                        parentTitle: s.title,
                        parentId: s._id,
                        parentSlug: s.slug,
                        text: c.text,
                        upvotes: c.upvotes,
                        createdAt: c.createdAt
                    });
                }
            });
        });

        userContribs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.status(200).json(userContribs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST follow a user
router.post("/follow/:authorId", authMiddleware, async (req, res) => {
    try {
        const followerId = req.user.id;
        const targetId = req.params.authorId;

        if (followerId === targetId) {
            return res.status(400).json({ success: false, message: "You cannot follow yourself" });
        }

        const targetUser = await User.findById(targetId);
        const followerUser = await User.findById(followerId);

        if (!targetUser || !followerUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (followerUser.following.includes(targetId)) {
            return res.status(400).json({ success: false, message: "You are already following this author" });
        }

        // Add to target's followers list
        targetUser.followers.push(followerId);
        targetUser.followersCount = targetUser.followers.length;
        await targetUser.save();

        // Add to follower's following list
        followerUser.following.push(targetId);
        followerUser.followingCount = followerUser.following.length;
        await followerUser.save();

        // Create notification
        const notification = new Notification({
            recipient: targetId,
            sender: followerId,
            type: "follow",
            message: `${followerUser.username} started following you.`
        });
        await notification.save();

        res.status(200).json({
            success: true,
            message: "Author followed successfully"
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST unfollow a user
router.post("/unfollow/:authorId", authMiddleware, async (req, res) => {
    try {
        const followerId = req.user.id;
        const targetId = req.params.authorId;

        const targetUser = await User.findById(targetId);
        const followerUser = await User.findById(followerId);

        if (!targetUser || !followerUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (!followerUser.following.includes(targetId)) {
            return res.status(400).json({ success: false, message: "You do not follow this author" });
        }

        targetUser.followers = targetUser.followers.filter(id => id.toString() !== followerId);
        targetUser.followersCount = targetUser.followers.length;
        await targetUser.save();

        followerUser.following = followerUser.following.filter(id => id.toString() !== targetId);
        followerUser.followingCount = followerUser.following.length;
        await followerUser.save();

        res.status(200).json({
            success: true,
            message: "Author unfollowed successfully"
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET follow status
router.get("/follow-status/:authorId", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.params.authorId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isFollowing = user.following.some(id => id.toString() === targetId);
        res.status(200).json({ isFollowing });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET followers list
router.get("/followers/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("followers", "username bio profilePhoto profileImage followers");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user.followers || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET following list
router.get("/following/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("following", "username bio profilePhoto profileImage followers");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user.following || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET following feed (stories and songs of followed authors)
router.get("/following-feed", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const followingIds = user.following || [];
        
        const stories = await Story.find({
            authorId: { $in: followingIds },
            status: "published"
        })
        .select("title summary coverImage genre likes comments slug author authorId createdAt storyType")
        .sort({ createdAt: -1 });

        const songs = await Song.find({
            authorId: { $in: followingIds },
            status: "published"
        })
        .select("title artistName genre coverImage summary tags author authorId likes comments contributions slug status createdAt")
        .sort({ createdAt: -1 });

        res.status(200).json({ stories, songs });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET recommended authors
router.get("/recommended-authors", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        let callerId = null;
        let callerUser = null;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "storyweave_secret_key_123");
                callerId = decoded.id;
                callerUser = await User.findById(callerId);
            } catch (e) {
                // Ignore
            }
        }

        const excludeIds = callerId ? [callerId, ...(callerUser.following || [])] : [];

        const suggestions = await User.find({
            _id: { $nin: excludeIds }
        })
        .sort({ followersCount: -1, totalProfileViews: -1 })
        .limit(5)
        .select("username bio profilePhoto profileImage followers");

        res.status(200).json(suggestions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT update profile (including bio)
router.put("/update-profile", authMiddleware, async (req, res) => {
    try {
        const { bio, profilePhoto } = req.body;
        if (bio && bio.length > 500) {
            return res.status(400).json({ message: "Bio cannot exceed 500 characters" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (bio !== undefined) {
            user.bio = bio;
        }
        if (profilePhoto !== undefined) {
            user.profilePhoto = profilePhoto;
            user.profileImage = profilePhoto; // sync for backwards compatibility
        }

        await user.save();

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                bio: user.bio,
                profilePhoto: user.profilePhoto,
                profileImage: user.profileImage
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT upload profile photo
router.put("/upload-photo", authMiddleware, (req, res, next) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(400).json({
            success: false,
            message: "Cloudinary credentials missing"
        });
    }
    const uploadSingle = upload.single("profilePhoto");
    uploadSingle(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ success: false, message: "Image exceeds 5MB" });
            }
            return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }
        next();
    });
}, async (req, res) => {
    try {
        console.log(`[DEBUG - SERVER] User profile photo upload file:`, req.file);
        const url = await uploadToCloudinary(req.file.buffer, "storyweave/profiles");
        console.log(`[DEBUG - SERVER] User profile photo uploaded successfully. URL: ${url}`);
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.profilePhoto = url;
        user.profileImage = url; // sync
        await user.save();

        res.status(200).json({
            url,
            message: "Photo uploaded successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                bio: user.bio,
                profilePhoto: user.profilePhoto,
                profileImage: user.profileImage
            }
        });
    } catch (err) {
        console.error(`[DEBUG - SERVER] User profile upload error:`, err);
        res.status(500).json({ message: "Image upload failed", error: err.message });
    }
});

export default router;
