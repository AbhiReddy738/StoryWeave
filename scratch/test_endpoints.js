import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from server's .env file
dotenv.config({ path: path.join(__dirname, "../../../../OneDrive - vit.ac.in/New Folder/dsp/storyWeaveWeb/server/.env") });

import Story from "../../../../OneDrive - vit.ac.in/New Folder/dsp/storyWeaveWeb/server/models/Story.js";
import User from "../../../../OneDrive - vit.ac.in/New Folder/dsp/storyWeaveWeb/server/models/user.js";

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;
const JWT_SECRET = process.env.JWT_SECRET || "storyweave_secret_key_123";

async function runTests() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        // Find a story that has contributions
        const story = await Story.findOne({ "contributions.0": { $exists: true } });
        if (!story) {
            console.log("No story found with contributions. Please add one first.");
            return;
        }

        const contribution = story.contributions[0];
        const storyId = story._id.toString();
        const contributionId = contribution._id.toString();

        console.log(`Testing with Story: "${story.title}" (${storyId})`);
        console.log(`Contribution by: "${contribution.author}" (${contributionId})`);

        // Find or create a test user to upvote
        let testUser = await User.findOne({ username: "testuser" });
        if (!testUser) {
            testUser = new User({
                username: "testuser",
                email: "testuser@example.com",
                password: "hashedpassword123"
            });
            await testUser.save();
        }
        const testUserId = testUser._id.toString();

        // Find the story author user to authenticate as author for accepting
        let authorUser = await User.findById(story.authorId);
        if (!authorUser) {
            // If authorId doesn't point to a user, associate it with an existing one
            authorUser = await User.findOne();
            story.authorId = authorUser._id;
            await story.save();
        }
        const authorId = authorUser._id.toString();

        // Generate JWT tokens
        const userToken = jwt.sign({ id: testUserId, email: testUser.email }, JWT_SECRET);
        const authorToken = jwt.sign({ id: authorId, email: authorUser.email }, JWT_SECRET);

        console.log("\n--- TEST 1: Toggle Upvote (Add Upvote) ---");
        let upvoteRes = await axios.put(`${BASE_URL}/story/${storyId}/contribution/${contributionId}/upvote`, {}, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log("Response status:", upvoteRes.status);
        console.log("Response data:", upvoteRes.data);

        console.log("\n--- TEST 2: Toggle Upvote (Remove Upvote) ---");
        upvoteRes = await axios.put(`${BASE_URL}/story/${storyId}/contribution/${contributionId}/upvote`, {}, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log("Response status:", upvoteRes.status);
        console.log("Response data:", upvoteRes.data);

        console.log("\n--- TEST 3: Accept Contribution with append=true ---");
        // Ensure contribution is currently not accepted
        contribution.accepted = false;
        contribution.status = "pending";
        await story.save();

        const acceptRes = await axios.post(`${BASE_URL}/story/${storyId}/contribution/${contributionId}/accept`, {
            append: true
        }, {
            headers: { Authorization: `Bearer ${authorToken}` }
        });
        console.log("Response status:", acceptRes.status);
        console.log("Response data success:", acceptRes.data.success);
        console.log("Accepted state in response:", acceptRes.data.contribution.accepted);
        console.log("Status in response:", acceptRes.data.contribution.status);
        
        // Fetch updated story from database to verify appending
        const updatedStory = await Story.findById(storyId);
        const textContent = Array.isArray(updatedStory.content) 
            ? JSON.stringify(updatedStory.content) 
            : updatedStory.content;
        console.log("Does content contain community contribution?:", textContent.includes("Community Contribution"));

    } catch (err) {
        console.error("Test failed with error:", err.response ? err.response.data : err.message);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

runTests();
