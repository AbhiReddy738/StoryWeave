import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Helper to generate token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET || "storyweave_secret_key_123",
        { expiresIn: "7d" }
    );
};

// POST /register
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        console.log(`[DEBUG - SERVER] Registration request received for email: ${email}`);

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.warn(`[DEBUG - SERVER] Registration failed: Email ${email} already in use`);
            return res.status(400).json({ message: "Email already registered" });
        }

        const user = new User({
            username,
            email,
            password
        });

        await user.save();

        const token = generateToken(user);
        console.log(`[DEBUG - SERVER] Registration success. Generated token for user ID: ${user._id}`);

        res.status(201).json({
            message: "User Registered",
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (err) {
        console.error(`[DEBUG - SERVER] Registration error:`, err);
        res.status(500).json({ message: err.message });
    }
});

// POST /login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[DEBUG - SERVER] Login request received for email: ${email}`);

        const user = await User.findOne({ email });

        if (!user) {
            console.warn(`[DEBUG - SERVER] Login failed: User not found for email ${email}`);
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (user.password !== password) {
            console.warn(`[DEBUG - SERVER] Login failed: Invalid password for email ${email}`);
            return res.status(400).json({
                message: "Invalid Password"
            });
        }

        const token = generateToken(user);
        console.log(`[DEBUG - SERVER] Login success. Generated token for user ID: ${user._id}`);

        res.status(200).json({
            message: "Login Successful",
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (err) {
        console.error(`[DEBUG - SERVER] Login error:`, err);
        res.status(500).json({
            message: err.message
        });
    }
});

// GET /me — validate token and load authenticated user
router.get("/me", authMiddleware, async (req, res) => {
    try {
        console.log(`[DEBUG - SERVER] Validating session/token for user ID: ${req.user.id}`);
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            console.warn(`[DEBUG - SERVER] Session validation failed: User ID ${req.user.id} not found in DB`);
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error(`[DEBUG - SERVER] Session validation error:`, err);
        res.status(500).json({ message: err.message });
    }
});

export default router;