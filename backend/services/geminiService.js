const { GoogleGenerativeAI } = require(`@google/generative-ai`);
const dotenv = require("dotenv");

dotenv.config();

const genAI = new GoogleGenerativeAI("AIzaSyB79Mj7kt7sBqo619BE7yFvKmw_H_CKUNA");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function callGemini(prompt) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Gemini API failed");
  }
}

module.exports =  { callGemini };