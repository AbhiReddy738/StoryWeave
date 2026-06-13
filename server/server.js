import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import storyRoutes from "./routes/story.js";
import userRoutes from "./routes/userRoutes.js";
import songRoutes from "./routes/song.js";
import authorRoutes from "./routes/authorRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.use("/api/auth", authRoutes);
app.use("/api/story", storyRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/user", userRoutes);
app.use("/api/song", songRoutes);
app.use("/api/authors", authorRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
    console.log("MongoDB Connected");
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
    } catch (err) {
        console.error("[DEBUG - SERVER] Failed to run startup slug migration:", err);
    }
})
.catch((err) => console.log(err));

app.get("/", (req, res) => {
    res.send("Backend Working");
});

app.listen(process.env.PORT, () => {
    console.log("Server Running");
});