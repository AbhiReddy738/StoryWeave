import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Story from "../models/Story.js";
import Song from "../models/Song.js";
import Follow from "../models/Follow.js";
import Notification from "../models/Notification.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Helper to validate object ID
const validateId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/authors/:id - Get author details and live statistics
router.get("/:id", async (req, res) => {
    try {
        const authorId = req.params.id;
        if (!validateId(authorId)) {
            return res.status(400).json({ success: false, message: "Invalid author ID format" });
        }

        const user = await User.findById(authorId);
        if (!user) {
            return res.status(404).json({ success: false, message: "Author not found" });
        }

        // Increment profile views if visitor is not the profile owner
        const authHeader = req.headers.authorization;
        let visitorId = null;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "storyweave_secret_key_123");
                visitorId = decoded.id;
            } catch (e) {
                // Ignore invalid tokens
            }
        }

        if (!visitorId || visitorId !== user._id.toString()) {
            user.totalProfileViews = (user.totalProfileViews || 0) + 1;
            user.profileViews = (user.profileViews || 0) + 1;
            await user.save();
        }

        const userId = user._id;

        // Perform dynamic aggregations for live stats
        // 1. Count stories published
        const totalStories = await Story.countDocuments({ authorId: userId, status: "published" });

        // 2. Count songs published
        const totalSongs = await Song.countDocuments({ authorId: userId, status: "published" });

        // 3. Total Posts (sum of published stories and songs)
        const totalPosts = totalStories + totalSongs;

        // 4. Aggregated Likes received across all published content
        const storyLikesAgg = await Story.aggregate([
            { $match: { authorId: userId, status: "published" } },
            { $group: { _id: null, totalLikes: { $sum: "$likes" } } }
        ]);
        const songLikesAgg = await Song.aggregate([
            { $match: { authorId: userId, status: "published" } },
            { $group: { _id: null, totalLikes: { $sum: "$likes" } } }
        ]);
        const totalLikesReceived = (storyLikesAgg[0]?.totalLikes || 0) + (songLikesAgg[0]?.totalLikes || 0);

        // 5. Aggregated Views across all published content
        const storyViewsAgg = await Story.aggregate([
            { $match: { authorId: userId, status: "published" } },
            { $group: { _id: null, totalViews: { $sum: "$views" } } }
        ]);
        const songViewsAgg = await Song.aggregate([
            { $match: { authorId: userId, status: "published" } },
            { $group: { _id: null, totalViews: { $sum: "$views" } } }
        ]);
        const totalViews = (storyViewsAgg[0]?.totalViews || 0) + (songViewsAgg[0]?.totalViews || 0);

        // 6. Followers count from Follow model
        const followersCount = await Follow.countDocuments({ followingId: userId });

        // 7. Following count from Follow model
        const followingCount = await Follow.countDocuments({ followerId: userId });

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            authorName: user.authorName || "",
            interests: user.interests || "",
            bio: user.bio || "",
            profilePhoto: user.profilePhoto || user.profileImage || "",
            createdAt: user.createdAt || user._id.getTimestamp(),
            followersCount,
            followingCount,
            stats: {
                totalStories,
                totalSongs,
                totalPosts,
                totalLikesReceived,
                totalViews,
                followersCount,
                followingCount
            }
        });

    } catch (err) {
        console.error("Error in GET /api/authors/:id:", err);
        res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
});

// GET /api/authors/:id/stories - Get published stories for author with pagination
router.get("/:id/stories", async (req, res) => {
    try {
        const authorId = req.params.id;
        if (!validateId(authorId)) {
            return res.status(400).json({ success: false, message: "Invalid author ID format" });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const skip = (page - 1) * limit;

        const stories = await Story.find({ authorId, status: "published" })
            .select("title summary coverImage genre likes comments slug author authorId createdAt storyType views")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Story.countDocuments({ authorId, status: "published" });

        res.status(200).json({
            stories,
            page,
            pages: Math.ceil(total / limit),
            total
        });

    } catch (err) {
        console.error("Error in GET /api/authors/:id/stories:", err);
        res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
});

// GET /api/authors/:id/songs - Get published songs for author with pagination
router.get("/:id/songs", async (req, res) => {
    try {
        const authorId = req.params.id;
        if (!validateId(authorId)) {
            return res.status(400).json({ success: false, message: "Invalid author ID format" });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const skip = (page - 1) * limit;

        const songs = await Song.find({ authorId, status: "published" })
            .select("title artistName genre coverImage summary tags author authorId likes comments contributions slug status createdAt views")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Song.countDocuments({ authorId, status: "published" });

        res.status(200).json({
            songs,
            page,
            pages: Math.ceil(total / limit),
            total
        });

    } catch (err) {
        console.error("Error in GET /api/authors/:id/songs:", err);
        res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
});

// POST /api/authors/:id/follow - Follow an author (authenticated)
router.post("/:id/follow", authMiddleware, async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = req.params.id;

        if (!validateId(followingId)) {
            return res.status(400).json({ success: false, message: "Invalid author ID format" });
        }

        if (followerId === followingId) {
            return res.status(400).json({ success: false, message: "You cannot follow yourself" });
        }

        // Validate target author exists
        const targetUser = await User.findById(followingId);
        const followerUser = await User.findById(followerId);

        if (!targetUser || !followerUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check duplicate follows in Follow model
        const existingFollow = await Follow.findOne({ followerId, followingId });
        if (existingFollow) {
            return res.status(400).json({ success: false, message: "You are already following this author" });
        }

        // Create new follow document
        const followDoc = new Follow({ followerId, followingId });
        await followDoc.save();

        // Update target/follower arrays and counts for backward compatibility
        await User.findByIdAndUpdate(followingId, {
            $addToSet: { followers: followerId },
            $inc: { followersCount: 1 }
        });
        await User.findByIdAndUpdate(followerId, {
            $addToSet: { following: followingId },
            $inc: { followingCount: 1 }
        });

        // Save follow notification
        const notification = new Notification({
            recipient: followingId,
            sender: followerId,
            type: "follow",
            message: `${followerUser.username} started following you.`
        });
        await notification.save();

        res.status(200).json({ success: true, message: "Followed author successfully" });

    } catch (err) {
        console.error("Error in POST /api/authors/:id/follow:", err);
        res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
});

// DELETE /api/authors/:id/follow - Unfollow an author (authenticated)
router.delete("/:id/follow", authMiddleware, async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = req.params.id;

        if (!validateId(followingId)) {
            return res.status(400).json({ success: false, message: "Invalid author ID format" });
        }

        // Delete Follow document
        const deletedFollow = await Follow.findOneAndDelete({ followerId, followingId });
        if (!deletedFollow) {
            return res.status(400).json({ success: false, message: "You are not following this author" });
        }

        // Update target/follower arrays and counts for compatibility
        await User.findByIdAndUpdate(followingId, {
            $pull: { followers: followerId },
            $inc: { followersCount: -1 }
        });
        await User.findByIdAndUpdate(followerId, {
            $pull: { following: followingId },
            $inc: { followingCount: -1 }
        });

        res.status(200).json({ success: true, message: "Unfollowed author successfully" });

    } catch (err) {
        console.error("Error in DELETE /api/authors/:id/follow:", err);
        res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
});

export default router;
