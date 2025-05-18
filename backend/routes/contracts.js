const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');
const { GridFSBucket } = require('mongodb');
const { parseWorkerFromPDF } = require('../services/pdfParseService');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to normalize file path for Docker environment
function normalizeFilePath(filePath) {
    // If we're in a Docker container and the path starts with /home/chenib
    if (process.env.DOCKER_CONTAINER && filePath.startsWith('/home/chenib')) {
        return filePath;
    }
    // If it's an absolute path, use it as is
    if (path.isAbsolute(filePath)) {
        return filePath;
    }
    // Otherwise, resolve relative to __dirname
    return path.resolve(__dirname, '..', filePath);
}

// Get current contract
router.get('/workers/:id/current-contract', async (req, res) => {
    const { id } = req.params;
    const db = req.db;

    try {
        console.log('Fetching contract for worker ID:', id);
        
        const employee = await db.collection('workers').findOne({
            _id: new ObjectId(id)
        });

        if (!employee) {
            console.log('Employee not found:', id);
            return res.status(404).json({ message: 'Employee not found' });
        }

        if (!employee.contractPath) {
            console.log('No contract path found for employee');
            return res.status(404).json({ message: 'No current contract found' });
        }

        // Try to serve from filesystem first
        const originalPath = employee.contractPath;
        const filePath = normalizeFilePath(originalPath);
        
        console.log('Contract path details:', {
            originalPath,
            normalizedPath: filePath,
            exists: fs.existsSync(filePath),
            dirname: __dirname,
            cwd: process.cwd()
        });

        // Check file existence and permissions
        try {
            const stats = fs.statSync(filePath);
            console.log('File stats:', {
                size: stats.size,
                mode: stats.mode.toString(8),
                uid: stats.uid,
                gid: stats.gid,
                isFile: stats.isFile(),
                path: filePath
            });
        } catch (statError) {
            console.error('Error checking file stats:', {
                error: statError.message,
                code: statError.code,
                path: filePath
            });
        }

        if (fs.existsSync(filePath)) {
            console.log('File exists, attempting to read...');

            // Test file readability
            try {
                fs.accessSync(filePath, fs.constants.R_OK);
                console.log('File is readable');
            } catch (accessError) {
                console.error('File access error:', {
                    error: accessError.message,
                    code: accessError.code,
                    path: filePath
                });
                return res.status(500).json({ 
                    message: 'File permission error',
                    error: accessError.message,
                    path: filePath
                });
            }

            console.log('Serving contract from filesystem:', filePath);

            // Set appropriate headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);

            // Stream the file instead of loading it all at once
            const fileStream = fs.createReadStream(filePath);
            
            fileStream.on('error', (error) => {
                console.error('Error streaming file:', {
                    error: error.message,
                    code: error.code,
                    path: filePath
                });
                if (error.code === 'EACCES') {
                    res.status(500).json({ 
                        message: 'Permission denied accessing contract file',
                        error: error.message,
                        path: filePath
                    });
                } else {
                    res.status(500).json({ 
                        message: 'Error streaming contract file',
                        error: error.message,
                        path: filePath
                    });
                }
            });

            fileStream.pipe(res);
            return;
        }

        console.log('Contract not found in filesystem at:', filePath);

        // If not in filesystem, try GridFS
        console.log('Trying GridFS...');
        const bucket = new GridFSBucket(db, {
            bucketName: 'contracts'
        });

        const gridFsFiles = await db.collection('contracts.files')
            .find({ 
                'metadata.employeeId': employee._id.toString(),
                'metadata.isCurrent': true 
            })
            .sort({ uploadDate: -1 })
            .limit(1)
            .toArray();

        if (!gridFsFiles.length) {
            console.log('No contract found in GridFS');
            return res.status(404).json({ 
                message: 'Contract file not found',
                path: filePath
            });
        }

        const gridFsFile = gridFsFiles[0];
        console.log('Found contract in GridFS:', gridFsFile.filename);

        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', `inline; filename="${gridFsFile.filename}"`);

        const downloadStream = bucket.openDownloadStream(gridFsFile._id);
        downloadStream.pipe(res);

        // Handle potential GridFS streaming errors
        downloadStream.on('error', (error) => {
            console.error('Error streaming from GridFS:', {
                error: error.message,
                code: error.code,
                fileId: gridFsFile._id
            });
            res.status(500).json({ 
                message: 'Error streaming contract file from GridFS',
                error: error.message
            });
        });

    } catch (error) {
        console.error('Error fetching current contract:', {
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ 
            message: 'Failed to fetch current contract',
            error: error.message
        });
    }
});

// Upload initial contract
router.post('/upload-pdf', upload.single('contract'), async (req, res) => {
    const db = req.db;

    if (!req.file) {
        return res.status(400).json({ 
            message: 'לא נבחר קובץ להעלאה',
            messageEn: 'No file uploaded'
        });
    }

    try {
        const workerData = await parseWorkerFromPDF(req.file.buffer);

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

        const existing = await db.collection('workers').findOne({ personalId: workerData.personalId });
        if (existing) {
            return res.status(409).json({ 
                message: 'עובד כבר קיים במערכת',
                messageEn: 'Worker already exists',
                workerId: existing._id 
            });
        }

        // Insert worker
        const workerResult = await db.collection('workers').insertOne({
            ...workerData,
            createdAt: new Date()
        });

        // Generate filename using worker ID and timestamp
        const timestamp = Date.now();
        const filename = `contract_${workerResult.insertedId}_${timestamp}.pdf`;
        
        // Save to filesystem with absolute path
        const contractsDir = path.resolve(__dirname, '..', 'contracts');
        if (!fs.existsSync(contractsDir)) {
            fs.mkdirSync(contractsDir, { recursive: true });
        }
        const filePath = path.join(contractsDir, filename);

        // Write file with proper permissions (readable by all)
        fs.writeFileSync(filePath, req.file.buffer, { mode: 0o644 });

        // Update worker with absolute contract path
        await db.collection('workers').updateOne(
            { _id: workerResult.insertedId },
            { $set: { contractPath: filePath } }
        );

        // Save to GridFS
        const bucket = new GridFSBucket(db, {
            bucketName: 'contracts'
        });

        const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
                employeeId: workerResult.insertedId.toString(),
                originalName: req.file.originalname,
                isCurrent: true,
                uploadDate: new Date(),
                type: 'contract',
                absolutePath: filePath  // Store the absolute path in metadata too
            }
        });

        uploadStream.end(req.file.buffer);

        // Wait for GridFS upload to complete
        await new Promise((resolve, reject) => {
            uploadStream.on('finish', resolve);
            uploadStream.on('error', reject);
        });

        res.status(201).json({ 
            message: 'העובד והחוזה נשמרו בהצלחה',
            messageEn: 'Worker and contract saved successfully',
            workerId: workerResult.insertedId,
            data: workerData
        });

    } catch (err) {
        console.error('PDF upload error:', err);
        res.status(500).json({ 
            message: 'שגיאה בעיבוד קובץ ה-PDF',
            messageEn: 'Failed to process PDF',
            error: err.message 
        });
    }
});

module.exports = router;