import express from "express";
import {
    chatWithAI,
    generateStorySummary,
    rateStory,
    analyzeHero,
    translateStory,
    suggestNextChapter,
    detectPlotHoles,
    analyzeCharacters,
    improveStory,
    analyzeSong
} from "../services/aiService.js";

const router = express.Router();

const handleAIRequest = async (req, res, actionName, action) => {
    console.log(`\n=================================================`);
    console.log(`[DEBUG] AI Request Received - Action: ${actionName}`);
    console.log(`[DEBUG] Request Body:`, JSON.stringify(req.body, null, 2));
    console.log(`[DEBUG] Gemini Key Exists:`, !!process.env.GEMINI_API_KEY);

    try {
        const result = await action();
        res.json({ success: true, result });
    } catch (error) {
        console.error(`[ERROR] Gemini Error in ${actionName}:`, error);
        console.error(`[ERROR] Gemini Error Message:`, error.message);
        console.error(`[ERROR] Gemini Stack:`, error.stack);
        
        if (error.message.includes("AI service not configured")) {
            res.status(503).json({ success: false, message: error.message, error: error.message });
        } else {
            res.status(500).json({ success: false, message: "AI generation failed.", error: error.message });
        }
    }
};

router.get("/health", (req, res) => {
    const rawKey = process.env.GEMINI_API_KEY;
    const keyPresent = !!(rawKey && rawKey.trim().length > 0);
    
    if (!keyPresent) {
        console.error("[DEBUG] AI Health Check: GEMINI_API_KEY is missing or empty.");
    } else {
        console.log("[DEBUG] AI Health Check: GEMINI_API_KEY is present.");
    }

    res.json({
        geminiConfigured: keyPresent,
        keyPresent: keyPresent
    });
});

router.get("/test", async (req, res) => {
    try {
        console.log("[DEBUG] /api/ai/test called");
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("Say hello");
        res.json({ success: true, message: result.response.text() });
    } catch (error) {
        console.error("[ERROR] Test Endpoint Failed:", error);
        res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
});

router.post("/chat", (req, res) => {
    const { prompt, context } = req.body;
    let finalPrompt = prompt;
    if (context) {
        finalPrompt = `Context:\n${context}\n\nUser: ${prompt}`;
    }
    handleAIRequest(req, res, "Chat", () => chatWithAI(finalPrompt, "You are an AI assistant in StoryWeave, helping the user with their stories or general questions. Use the provided context if available to answer questions about the story."));
});

router.post("/story-summary", (req, res) => {
    const { storyText } = req.body;
    handleAIRequest(req, res, "Story Summary", () => generateStorySummary(storyText));
});

router.post("/story-rating", (req, res) => {
    const { storyText } = req.body;
    handleAIRequest(req, res, "Story Rating", () => rateStory(storyText));
});

router.post("/story-analysis", (req, res) => {
    const { storyText, type } = req.body;
    if (type === "Hero") {
        handleAIRequest(req, res, "Hero Analysis", () => analyzeHero(storyText));
    } else {
        handleAIRequest(req, res, "Character Analysis", () => analyzeCharacters(storyText));
    }
});

router.post("/translate", (req, res) => {
    const { storyText, language } = req.body;
    handleAIRequest(req, res, "Translate", () => translateStory(storyText, language));
});

router.post("/next-chapter", (req, res) => {
    const { storyText } = req.body;
    handleAIRequest(req, res, "Next Chapter", () => suggestNextChapter(storyText));
});

router.post("/plot-holes", (req, res) => {
    const { storyText } = req.body;
    handleAIRequest(req, res, "Plot Holes", () => detectPlotHoles(storyText));
});

router.post("/improve", (req, res) => {
    const { storyText } = req.body;
    handleAIRequest(req, res, "Improve Story", () => improveStory(storyText));
});

router.post("/song-analysis", (req, res) => {
    const { lyrics, action } = req.body;
    handleAIRequest(req, res, "Song Analysis", () => analyzeSong(lyrics, action));
});

export default router;
