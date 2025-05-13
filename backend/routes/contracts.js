const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { parseWorkerFromPDF } = require('../services/pdfParseService');

const router = express.Router();

const contractsDir = path.join(__dirname, '..', 'contracts');
if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, contractsDir),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}_${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage });

router.post('/upload-pdf', upload.any(), async (req, res) => {
    const db = req.db;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ 
            message: 'לא נבחר קובץ להעלאה',
            messageEn: 'No file uploaded'
        });
    }

    const filePath = req.files[0].path;

    try {
        const workerData = await parseWorkerFromPDF(filePath);

        if (!workerData.contributionRates) {
            workerData.contributionRates = {
                employeeSeverance: 6.0,
                employerSeverance: 8.33,
                employeePension: 6.0,
                employerPension: 6.5,
                employeeEducationFund: 2.5,
                employerEducationFund: 7.5
            };
        }

        workerData.contractPath = `/contracts/${path.basename(filePath)}`;
        workerData.createdAt = new Date();

        const existing = await db.collection('workers').findOne({ personalId: workerData.personalId });
        if (existing) {
            fs.unlinkSync(filePath);
            return res.status(409).json({ 
                message: 'עובד כבר קיים במערכת',
                messageEn: 'Worker already exists',
                workerId: existing._id 
            });
        }

        const result = await db.collection('workers').insertOne(workerData);
        
        res.status(201).json({ 
            message: 'העובד והחוזה נשמרו בהצלחה',
            messageEn: 'Worker and contract saved successfully',
            workerId: result.insertedId,
            data: workerData
        });

    } catch (err) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        console.error('PDF upload error:', err);
        res.status(500).json({ 
            message: 'שגיאה בעיבוד קובץ ה-PDF',
            messageEn: 'Failed to process PDF',
            error: err.message 
        });
    }
});

module.exports = router;