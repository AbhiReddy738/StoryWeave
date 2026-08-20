import { GoogleGenAI } from "@google/genai";

let aiClient = null;

const getAIClient = () => {
    const rawKey = process.env.GEMINI_API_KEY;
    const API_KEY = rawKey ? rawKey.trim() : null;

    if (!API_KEY) {
        console.error("[ERROR] GEMINI_API_KEY is missing from environment variables.");
        throw new Error("AI service unavailable: Invalid Gemini API configuration.");
    }

    if (!aiClient) {
        console.log("[INFO] Gemini API key configured: true");
        aiClient = new GoogleGenAI({ apiKey: API_KEY });
    }
    return aiClient;
};

// Generic chat completion using @google/genai
export const chatWithAI = async (prompt, systemInstruction = "") => {
    try {
        const client = getAIClient();
        let contents = prompt;
        if (systemInstruction) {
            contents = `System: ${systemInstruction}\n\nUser: ${prompt}`;
        }

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents
        });

        if (!response || !response.text) {
            throw new Error("Gemini request failed: Empty response received.");
        }

        return response.text;
    } catch (error) {
        console.error("[ERROR] Gemini Service Failure:", error.message);
        throw new Error(error.message || "Gemini request failed.");
    }
};

export const generateStorySummary = async (storyText) => {
    const prompt = `Generate a concise summary of this story. Return it in this exact format:
Short Summary: [1 sentence]
Detailed Summary: [1 paragraph]
Key Themes: [Comma separated list]

Story:
${storyText.substring(0, 5000)}`;
    return await chatWithAI(prompt);
};

export const rateStory = async (storyText) => {
    const prompt = `Rate this story out of 10 in the following categories. Be honest but constructive. Return ONLY this exact format, nothing else:
Creativity: [X/10] - [Short reason]
Characters: [X/10] - [Short reason]
World Building: [X/10] - [Short reason]
Writing Style: [X/10] - [Short reason]
Engagement: [X/10] - [Short reason]
Overall Rating: [X/10]

Story:
${storyText.substring(0, 5000)}`;
    return await chatWithAI(prompt);
};

export const analyzeHero = async (storyText) => {
    const prompt = `Analyze the main protagonist of this story. Return in this exact format:
Strengths: [List]
Weaknesses: [List]
Growth: [Short description]
Character Arc: [Short description]

Story:
${storyText.substring(0, 5000)}`;
    return await chatWithAI(prompt);
};

export const translateStory = async (storyText, language) => {
    const prompt = `Translate the following story into ${language}. Keep the original formatting and tone.

Story:
${storyText.substring(0, 3000)}`;
    return await chatWithAI(prompt);
};

export const suggestNextChapter = async (storyText) => {
    const prompt = `Suggest 5 possible next chapters for this story. Make them engaging and logical based on the current plot. Return as a numbered list with a short title and 1-sentence description for each.

Story:
${storyText.substring(0, 5000)}`;
    return await chatWithAI(prompt);
};

export const detectPlotHoles = async (storyText) => {
    const prompt = `Identify logical inconsistencies or plot holes in this story. Return in this exact format:
Potential Plot Holes:
- [Hole 1]
- [Hole 2]

Suggestions:
- [Suggestion 1]
- [Suggestion 2]

Story:
${storyText.substring(0, 5000)}`;
    return await chatWithAI(prompt);
};

export const analyzeCharacters = async (storyText) => {
    const prompt = `Analyze all major characters in this story. Return as a list formatted like this for each character:
Character Name
Role: [Role]
Motivation: [Motivation]
Relationships: [Relationships]

Story:
${storyText.substring(0, 5000)}`;
    return await chatWithAI(prompt);
};

export const improveStory = async (storyText) => {
    const prompt = `Suggest improvements for this story. Return in this exact format:
Writing Improvements:
- [Point 1]
- [Point 2]

Grammar Improvements:
- [Point 1]

Story Improvements:
- [Point 1]

Story:
${storyText.substring(0, 5000)}`;
    return await chatWithAI(prompt);
};

export const analyzeSong = async (lyrics, action) => {
    let prompt = "";
    if (action === "Summary") {
        prompt = `Summarize the core message of these lyrics in one paragraph:\n\n${lyrics}`;
    } else if (action === "Meaning Analysis") {
        prompt = `Analyze the deeper meaning and metaphors in these lyrics:\n\n${lyrics}`;
    } else if (action === "Emotion Analysis") {
        prompt = `What are the primary emotions conveyed in these lyrics? Explain briefly:\n\n${lyrics}`;
    } else if (action === "Rate Lyrics") {
        prompt = `Rate these lyrics out of 10 based on wordplay, emotion, and rhythm. Give a short explanation:\n\n${lyrics}`;
    } else if (action === "Improve Lyrics") {
        prompt = `Suggest ways to improve these lyrics (e.g. better rhymes, stronger imagery):\n\n${lyrics}`;
    } else {
        prompt = `Analyze these lyrics:\n\n${lyrics}`;
    }
    return await chatWithAI(prompt);
};
