const { GoogleGenerativeAI } = require(`@google/generative-ai`);
const dotenv = require("dotenv");

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyB79Mj7kt7sBqo619BE7yFvKmw_H_CKUNA");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

async function callGeminiWithFile(fileBytes, prompt) {
  try {
    const imageParts = [{
      inlineData: {
        data: fileBytes.toString('base64'),
        mimeType: 'application/pdf'
      }
    }];

    const promptPart = {
      text: prompt
    };

    const parts = [promptPart, ...imageParts];

    const result = await model.generateContent(parts);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini File Processing Error:", error);
    throw new Error("Gemini file processing failed");
  }
}

module.exports = { callGemini, callGeminiWithFile };