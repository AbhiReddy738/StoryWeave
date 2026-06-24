import "dotenv/config.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import storyRoutes from "./routes/story.js";
import userRoutes from "./routes/userRoutes.js";
import songRoutes from "./routes/song.js";
import authorRoutes from "./routes/authorRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

const app = express();

app.use(express.json());
app.use(cors());

// Health check route does not require DB
app.get("/", (req, res) => {
    res.send("Backend Working");
});

// Serve uploads static files (no DB required)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database check middleware for API endpoints
app.use("/api", (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            message: "Database is temporarily unavailable. Please try again later."
        });
    }
    next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/story", storyRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/user", userRoutes);
app.use("/api/song", songRoutes);
app.use("/api/authors", authorRoutes);
app.use("/api/ai", aiRoutes);

const startServer = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");

        // Run migrations
        try {
            const Story = mongoose.model("Story");
            const storiesWithoutSlug = await Story.find({
                $or: [
                    { slug: { $exists: false } },
                    { slug: null },
                    { slug: "" }
                ]
            });
            if (storiesWithoutSlug.length > 0) {
                console.log(`[DEBUG - SERVER] Found ${storiesWithoutSlug.length} stories without a slug. Generating slugs...`);
                for (const story of storiesWithoutSlug) {
                    story.slug = story.title
                        .toLowerCase()
                        .replace(/[^a-z0-9\s]/g, "")
                        .trim()
                        .replaceAll(" ", "-");
                    if (!story.slug) {
                        story.slug = "story-" + Date.now();
                    }
                    await story.save();
                    console.log(`[DEBUG - SERVER] Generated slug "${story.slug}" for story "${story.title}" (ID: ${story._id})`);
                }
            } else {
                console.log("[DEBUG - SERVER] All stories have slugs in database.");
            }

            const Song = mongoose.model("Song");
            const songsWithoutSlug = await Song.find({
                $or: [
                    { slug: { $exists: false } },
                    { slug: null },
                    { slug: "" }
                ]
            });
            if (songsWithoutSlug.length > 0) {
                console.log(`[DEBUG - SERVER] Found ${songsWithoutSlug.length} songs without a slug. Generating slugs...`);
                for (const song of songsWithoutSlug) {
                    song.slug = (song.title || "song")
                        .toLowerCase()
                        .replace(/[^a-z0-9\s]/g, "")
                        .trim()
                        .replaceAll(" ", "-");
                    if (!song.slug) {
                        song.slug = "song-" + Date.now();
                    }
                    await song.save();
                    console.log(`[DEBUG - SERVER] Generated slug "${song.slug}" for song "${song.title}" (ID: ${song._id})`);
                }
            } else {
                console.log("[DEBUG - SERVER] All songs have slugs in database.");
            }
        } catch (migrationErr) {
            console.error("[DEBUG - SERVER] Failed to run startup slug migration:", migrationErr.message);
        }

        app.listen(process.env.PORT, () => {
            console.log(`Server Running on port ${process.env.PORT}`);
        });

    } catch (err) {
        console.error("FATAL: Database connection failed during startup. Exiting process...", err);
        process.exit(1);
    }
};

startServer();
