const express = require('express');
const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');

const router = express.Router();

// List documents of a specific type
router.get('/:id/:type', async (req, res) => {
    const { id, type } = req.params;
    const db = req.db;

    try {
        const documents = await db.collection('documents')
            .find({
                employeeId: new ObjectId(id),
                type: type
            })
            .sort({ date: -1 })
            .toArray();

        res.json(documents.map(doc => ({
            id: doc._id,
            title: doc.title,
            date: doc.date,
            type: doc.type
        })));
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ message: 'Failed to fetch documents' });
    }
});

// Download a specific document
router.get('/:id/:type/:docId/download', async (req, res) => {
    const { id, type, docId } = req.params;
    const db = req.db;

    try {
        const document = await db.collection('documents').findOne({
            _id: new ObjectId(docId),
            employeeId: new ObjectId(id),
            type: type
        });

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const filePath = path.join(__dirname, '..', 'documents', document.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Document file not found' });
        }

        res.download(filePath, document.originalName);
    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({ message: 'Failed to download document' });
    }
});

// Preview a specific document
router.get('/:id/:type/:docId/preview', async (req, res) => {
    const { id, type, docId } = req.params;
    const db = req.db;

    try {
        const document = await db.collection('documents').findOne({
            _id: new ObjectId(docId),
            employeeId: new ObjectId(id),
            type: type
        });

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const filePath = path.join(__dirname, '..', 'documents', document.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Document file not found' });
        }

        res.sendFile(filePath);
    } catch (error) {
        console.error('Error previewing document:', error);
        res.status(500).json({ message: 'Failed to preview document' });
    }
});

module.exports = router; 