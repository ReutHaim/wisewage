const express = require('express');
const router = express.Router();

router.post('/signup', async (req, res) => {
    const { name, username, password, companyCode } = req.body;
    const db = req.db;

    if (!name || !username || !password || !companyCode) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const existingUser = await db.collection('users').findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        const result = await db.collection('users').insertOne({
            name,
            username,
            password,
            companyCode,
            createdAt: new Date()
        });

        res.status(201).json({ message: 'User registered successfully', userId: result.insertedId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password, companyCode } = req.body;
    const db = req.db;

    if (!username || !password || !companyCode) {
        return res.status(400).json({ message: 'Username, password, and company code are required.' });
    }

    try {
        const user = await db.collection('users').findOne({ username });

        if (!user || user.password !== password || user.companyCode !== companyCode) {
            return res.status(401).json({ message: 'Invalid username, password, or company code.' });
        }

        res.json({ message: 'Login successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;