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
    console.log(`[INFO] AI Request Received - Action: ${actionName}`);

    try {
        const result = await action();
        res.json({ success: true, result });
    } catch (error) {
        console.error(`[ERROR] Gemini Error in ${actionName}:`, error.message);
        
        let clientMessage = "Gemini request failed.";
        let statusCode = 500;

        if (error.message.includes("unavailable") || error.message.includes("configuration")) {
            clientMessage = "AI service unavailable. Invalid Gemini API configuration.";
            statusCode = 503;
        }

        res.status(statusCode).json({
            success: false,
            message: clientMessage
        });
    }
};

router.get("/health", (req, res) => {
    const rawKey = process.env.GEMINI_API_KEY;
    const keyPresent = !!(rawKey && rawKey.trim().length > 0);

    res.json({
        geminiConfigured: keyPresent,
        keyPresent: keyPresent
    });
});

router.get("/test", async (req, res) => {
    try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Say hello"
        });
        res.json({ success: true, message: response.text });
    } catch (error) {
        console.error("[ERROR] Test Endpoint Failed:", error.message);
        res.status(500).json({ success: false, message: "Gemini request failed." });
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
