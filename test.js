if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const wasteManagementKeywords = [
    "waste management", "recycling", "composting", "waste disposal", "sustainability",
    "environment", "garbage", "trash", "reuse", "reduce", "recycle", "dispose", "landfill",
    "biodegradable", "e-waste", "hazardous waste", "organic waste", "plastic waste",
    "waste segregation", "zero waste", "circular economy", "waste reduction", "incineration",
    "vermicomposting", "municipal waste", "toxic waste", "pollution control", "carbon footprint",
    "green waste", "ocean waste", "waste-to-energy", "solid waste", "medical waste",
    "industrial waste", "sustainable practices"
];

function isRelevantQuestion(question) {
    return wasteManagementKeywords.some(keyword => question.toLowerCase().includes(keyword));
}

async function generateResponse(text) {
    try {
        if (!isRelevantQuestion(text)) {
            return "Please ask questions related to waste management or recycling.";
        }

        const prompt = text;
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Error generating response:", error);
        throw error;
    }
}

module.exports = { generateResponse };