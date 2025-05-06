const express = require("express");
const { callGemini } = require("../services/geminiService.js");

const router = express.Router();

router.post("/", async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ message: "Prompt is required." });
    }

    try {
        const reply = await callGemini(prompt);
        res.json({ reply });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;