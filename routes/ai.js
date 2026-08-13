const express = require("express");
const router = express.Router();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// =====================================================
// FEATURE 1A — AI DESCRIPTION GENERATOR
// =====================================================

router.post("/generate-description", async (req, res) => {
    try {
        const {
            title = "",
            location = "",
            country = "",
            price = ""
        } = req.body || {};

        if (!title || !location || !country || !price) {
            return res.status(400).json({
                success: false,
                message: "Please provide title, location, country and price."
            });
        }

        const prompt = `
Write an attractive and natural property description for a travel
booking website.

Property details:
Title: ${title}
Location: ${location}
Country: ${country}
Price per night: ₹${price}

Requirements:
- Write 80 to 120 words.
- Make it appealing to travelers.
- Keep it professional but warm.
- Mention the location and property naturally.
- Do not invent amenities or facilities.
- Do not mention AI.
- Return only the description.
`;

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt
        });

        res.json({
            success: true,
            description: response.text
        });

    } catch (error) {
        console.error("Gemini API Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to generate description."
        });
    }
});


// =====================================================
// FEATURE 1B — AI COMPLETE LISTING GENERATOR
// =====================================================

router.post("/generate-listing", async (req, res) => {
    try {
        const { idea = "" } = req.body || {};

        if (!idea.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please enter an idea for the listing."
            });
        }

        const prompt = `
You are an AI assistant for a travel booking website.

Create a complete property listing based on this user's idea:

"${idea}"

Return ONLY valid JSON in exactly this format:

{
    "title": "A short attractive property title",
    "description": "An attractive 80 to 120 word property description",
    "location": "City or specific location",
    "country": "Country name",
    "price": 2500
}

Rules:
- Make the title attractive but realistic.
- Description must be 80 to 120 words.
- Keep the description professional, natural and warm.
- Do not mention AI.
- Do not invent specific amenities unless they are clearly implied by the user's idea.
- Infer a reasonable location and country only when the idea clearly suggests them.
- Price must be a realistic numeric amount for one night.
- "price" must contain only a number.
- Do not add markdown.
- Do not add explanations.
- Return ONLY the JSON object.
`;

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt
        });

        let text = response.text.trim();

        text = text.replace(/^```json\s*/i, "");
        text = text.replace(/^```\s*/i, "");
        text = text.replace(/\s*```$/i, "");

        const listing = JSON.parse(text);

        res.json({
            success: true,
            listing: listing
        });

    } catch (error) {
        console.error("AI Listing Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to generate complete listing."
        });
    }
});


// =====================================================
// FEATURE 2 — TRUSTGUARD AI RISK EXPLANATION
// =====================================================

router.post("/trust-explanation", async (req, res) => {
    try {
        const {
            score,
            riskLevel,
            signals = [],
            title = "",
            location = "",
            country = "",
            price = ""
        } = req.body || {};

        if (
            score === undefined ||
            !riskLevel ||
            !title
        ) {
            return res.status(400).json({
                success: false,
                message: "Insufficient listing risk information."
            });
        }

        const signalText = signals
            .map(signal => `${signal.type}: ${signal.text}`)
            .join("\n");

        const prompt = `
You are TrustGuard, an AI-assisted safety analysis system
for a travel booking website.

Do NOT determine whether a listing is definitely a scam.

Explain the risk signals and give practical advice.

Listing:
Title: ${title}
Location: ${location}
Country: ${country}
Price per night: ₹${price}

TrustGuard Score: ${score}/100
Risk Level: ${riskLevel}

Detected signals:
${signalText}

Return ONLY valid JSON:

{
    "summary": "2 to 3 sentence explanation.",
    "keyConcern": "Most important concern.",
    "recommendation": "Practical recommendation.",
    "safetyTips": [
        "Tip 1",
        "Tip 2",
        "Tip 3"
    ]
}

Rules:
- Do not claim fraud.
- Do not invent facts.
- Do not mention AI.
- Exactly 3 safety tips.
- Return ONLY JSON.
`;

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt
        });

        let text = response.text.trim();

        text = text.replace(/^```json\s*/i, "");
        text = text.replace(/^```\s*/i, "");
        text = text.replace(/\s*```$/i, "");

        const explanation = JSON.parse(text);

        res.json({
            success: true,
            explanation
        });

    } catch (error) {
        console.error("TrustGuard AI Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to generate TrustGuard explanation."
        });
    }
});


// =====================================================
// FEATURE 3 — AI REVIEW INTELLIGENCE
// =====================================================

router.post("/review-intelligence", async (req, res) => {
    try {

        const {
            title = "",
            reviews = []
        } = req.body || {};

        if (!title || !Array.isArray(reviews)) {
            return res.status(400).json({
                success: false,
                message: "Invalid review data."
            });
        }

        if (reviews.length === 0) {
            return res.json({
                success: true,
                intelligence: {
                    sentiment: "Not enough data",
                    summary: "This listing does not have enough reviews to generate guest insights.",
                    strengths: [],
                    concerns: [],
                    bestFor: "Not enough data",
                    notIdealFor: "Not enough data"
                }
            });
        }


        const reviewText = reviews
            .map((review, index) => {
                return `Review ${index + 1}:
Rating: ${review.rating}/5
Comment: ${review.comment}`;
            })
            .join("\n\n");


        const prompt = `
You are an AI review intelligence system for a travel
booking website.

Analyze the guest reviews for this property.

Property:
${title}

Reviews:
${reviewText}

Return ONLY valid JSON in exactly this format:

{
    "sentiment": "Positive",
    "summary": "A concise 2 to 3 sentence summary of what guests think.",
    "strengths": [
        "Thing guests commonly appreciate",
        "Another positive aspect",
        "Another positive aspect"
    ],
    "concerns": [
        "Common complaint or weakness",
        "Another concern"
    ],
    "bestFor": "Type of traveler this property appears suitable for.",
    "notIdealFor": "Type of traveler this property may not be ideal for."
}

Rules:
- sentiment must be exactly one of:
  "Very Positive", "Positive", "Mixed", "Negative", "Very Negative"
- Analyze the actual review comments.
- Do not invent amenities or experiences.
- Do not assume something is good or bad without review evidence.
- strengths should contain 2 to 4 items.
- concerns should contain 0 to 3 items.
- Keep everything concise.
- Do not mention AI.
- Do not use markdown.
- Return ONLY the JSON object.
`;


        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt
        });


        let text = response.text.trim();

        text = text.replace(/^```json\s*/i, "");
        text = text.replace(/^```\s*/i, "");
        text = text.replace(/\s*```$/i, "");


        const intelligence = JSON.parse(text);


        res.json({
            success: true,
            intelligence
        });

    } catch (error) {

        console.error(
            "Review Intelligence Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to analyze reviews."
        });
    }
});


// =====================================================
// EXPORT
// =====================================================

module.exports = router;