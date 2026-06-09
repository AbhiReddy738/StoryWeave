import express from "express";
import multer from "multer";
import path from "path";
import User from "../models/user.js";
import Story from "../models/Story.js";

const router = express.Router();

// Multer Config for Profile Photo upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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
router.put("/update/:id", async (req, res) => {
    try {
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
router.post("/upload", upload.single("profileImage"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        res.status(200).json({ url: fileUrl });
    } catch (err) {
        res.status(500).json({ message: err.message });
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

export default router;
