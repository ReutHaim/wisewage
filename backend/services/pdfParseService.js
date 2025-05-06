const fs = require("fs");
const pdfParse = require("pdf-parse");
const { callGemini } = require("./geminiService");
const path = require("path");

function cleanGeminiOutput(output) {
    return output
        .replace(/```json\s*/gi, '')
        .replace(/```/g, '')
        .replace(/,\s*([}\]])/g, '$1')
        .trim();
}

async function parseWorkerFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const rawText = data.text;

    const prompt = `
    The following text is taken from an employee contract. Please extract the following details and return them in valid JSON format (no markdown, no explanation):
    
    - firstName
    - lastName
    - role
    - startDate
    - email
    - phone
    - personalId
    - salaryDetails: A free-text or structured field that contains all salary-related terms
    
    Text:
    """${rawText}"""
    `;

    const structuredJson = cleanGeminiOutput(await callGemini(prompt));

    try {
        const parsed = JSON.parse(structuredJson);
        console.log(parsed);
        return parsed;
    } catch (err) {
        console.error("Gemini JSON parsing error:", err);
        console.error("Original response:", structuredJson);
        throw new Error("Failed to parse Gemini output as JSON");
    }
}

module.exports = { parseWorkerFromPDF };