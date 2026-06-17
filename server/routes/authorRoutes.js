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

// GET /api/authors/:id - Get author details and live statistics
router.get("/:id", async (req, res) => {
    try {
        let user;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            user = await User.findById(req.params.id);
        } else {
            user = await User.findOne({ username: req.params.id });
        }

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
        let authorId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(authorId)) {
            const user = await User.findOne({ username: authorId });
            if (!user) {
                return res.status(404).json({ success: false, message: "Author not found" });
            }
            authorId = user._id;
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
        let authorId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(authorId)) {
            const user = await User.findOne({ username: authorId });
            if (!user) {
                return res.status(404).json({ success: false, message: "Author not found" });
            }
            authorId = user._id;
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
        let followingId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(followingId)) {
            const user = await User.findOne({ username: followingId });
            if (!user) {
                return res.status(404).json({ success: false, message: "Author not found" });
            }
            followingId = user._id.toString();
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

        if (followerUser.following.includes(followingId)) {
            return res.status(400).json({ success: false, message: "You are already following this author" });
        }

        // Add to target's followers list
        targetUser.followers.push(followerId);
        targetUser.followersCount = targetUser.followers.length;
        await targetUser.save();

        // Add to follower's following list
        followerUser.following.push(followingId);
        followerUser.followingCount = followerUser.following.length;
        await followerUser.save();

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
        let followingId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(followingId)) {
            const user = await User.findOne({ username: followingId });
            if (!user) {
                return res.status(404).json({ success: false, message: "Author not found" });
            }
            followingId = user._id.toString();
        }

        const targetUser = await User.findById(followingId);
        const followerUser = await User.findById(followerId);

        if (!targetUser || !followerUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Delete Follow document
        const deletedFollow = await Follow.findOneAndDelete({ followerId, followingId });
        if (!deletedFollow) {
            return res.status(400).json({ success: false, message: "You are not following this author" });
        }

        if (!followerUser.following.includes(followingId)) {
            return res.status(400).json({ success: false, message: "You do not follow this author" });
        }

        targetUser.followers = targetUser.followers.filter(id => id.toString() !== followerId);
        targetUser.followersCount = targetUser.followers.length;
        await targetUser.save();

        followerUser.following = followerUser.following.filter(id => id.toString() !== followingId);
        followerUser.followingCount = followerUser.following.length;
        await followerUser.save();

        res.status(200).json({ success: true, message: "Unfollowed author successfully" });

    } catch (err) {
        console.error("Error in DELETE /api/authors/:id/follow:", err);
        res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
});

export default router;
