import express from "express";
import Story from "../models/Story.js";
import User from "../models/user.js";

const router = express.Router();

router.get("/all", async (req, res) => {

    try {

        const stories = await Story.find();

        res.status(200).json(stories);

    }
    catch (err) {

        res.status(500).json(err);

    }

});
router.get("/:id", async (req, res) => {

    try {

        const story = await Story.findById(
            req.params.id
        );

        if (!story) {

            return res.status(404).json({
                message: "Story not found"
            });

        }

        res.status(200).json(story);

    }
    catch (err) {

        res.status(500).json({
            message: "Server Error"
        });

    }

});

router.post("/create", async (req, res) => {

    try {

        const slug =
            req.body.title
                .toLowerCase()
                .replaceAll(" ", "-")
            + "-"
            + Date.now();

        const story = new Story({
            ...req.body,
            slug
        });

        await story.save();

        res.status(201).json({
            message: "Story Created"
        });

    }
    catch (err) {

        res.status(500).json(err);

    }

});

router.put("/like/:id", async (req, res) => {

    try {

        const story = await Story.findById(
            req.params.id
        );

        if (!story) {

            return res.status(404).json({
                message: "Story not found"
            });

        }

        story.likes += 1;

        await story.save();

        res.status(200).json(story);

    }
    catch (err) {

        res.status(500).json(err);

    }

});

router.post("/comment/:id", async (req, res) => {

    try {

        const story = await Story.findById(
            req.params.id
        );

        if (!story) {

            return res.status(404).json({
                message: "Story not found"
            });

        }

        story.comments.push({

            username: req.body.username,

            text: req.body.text

        });

        await story.save();

        res.status(200).json(story);

    }
    catch (err) {

        res.status(500).json(err);

    }

});

router.post("/contribution/:id", async (req, res) => {

    try {

        const story = await Story.findById(
            req.params.id
        );

        if (!story) {

            return res.status(404).json({
                message: "Story not found"
            });

        }

        story.contributions.push({

            author: req.body.author,

            text: req.body.text,

            upvotes: 0

        });

        await story.save();

        res.status(200).json(story);

    }
    catch (err) {

        res.status(500).json(err);

    }

});

router.put(
    "/contribution/upvote/:storyId/:contributionId",
    async (req, res) => {

        try {

            const story = await Story.findById(
                req.params.storyId
            );

            if (!story) {

                return res.status(404).json({
                    message: "Story not found"
                });

            }

            const contribution =
                story.contributions.id(
                    req.params.contributionId
                );

            if (!contribution) {

                return res.status(404).json({
                    message: "Contribution not found"
                });

            }

            contribution.upvotes += 1;

            await story.save();

            res.status(200).json(story);

        }
        catch (err) {

            res.status(500).json(err);

        }

    });

// Save a story
router.post("/save/:id", async (req, res) => {
    try {
        const { userId } = req.body;
        const storyId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (!user.savedStories.includes(storyId)) {
            user.savedStories.push(storyId);
            await user.save();
        }
        res.status(200).json({ message: "Story saved successfully", savedStories: user.savedStories });
    } catch (err) {
        res.status(500).json(err);
    }
});

// Unsave a story
router.post("/unsave/:id", async (req, res) => {
    try {
        const { userId } = req.body;
        const storyId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        user.savedStories = user.savedStories.filter(id => id.toString() !== storyId);
        await user.save();
        res.status(200).json({ message: "Story unsaved successfully", savedStories: user.savedStories });
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get saved stories for a user
router.get("/saved/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate("savedStories");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user.savedStories);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Check if a story is saved by a user
router.get("/is-saved/:storyId/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isSaved = user.savedStories.includes(req.params.storyId);
        res.status(200).json({ isSaved });
    } catch (err) {
        res.status(500).json(err);
    }
});

// Delete a story
router.delete("/delete/:storyId", async (req, res) => {
    try {
        const story = await Story.findByIdAndDelete(req.params.storyId);
        if (!story) {
            return res.status(404).json({ message: "Story not found" });
        }
        res.status(200).json({ message: "Story deleted successfully" });
    } catch (err) {
        res.status(500).json(err);
    }
});

export default router;