import express from "express";
import multer from "multer";
import path from "path";
import User from "../models/user.js";
import Story from "../models/Story.js";
import Song from "../models/Song.js";
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
            profileImage: user.profileImage || ""
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
        });
        
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
        }).sort({ createdAt: -1 });
        
        res.status(200).json(songs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
