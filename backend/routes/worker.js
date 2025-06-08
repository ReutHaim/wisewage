const express = require('express');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { parseWorkerFromPDF } = require('../services/pdfParseService');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            const contractsDir = path.join(__dirname, '..', 'contracts');
            if (!fs.existsSync(contractsDir)) {
                fs.mkdirSync(contractsDir, { recursive: true });
            }
            cb(null, contractsDir);
        },
        filename: function (req, file, cb) {
            const timestamp = Date.now();
            cb(null, `contract_${req.params.id}_${timestamp}.pdf`);
        }
    }),
    fileFilter: function (req, file, cb) {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }
        cb(null, true);
    }
});

// CREATE worker
router.post('/', async (req, res) => {
  const db = req.db;
  const {
    firstName,
    lastName,
    address,
    role,
    department,
    startDate,
    email,
    phone,
    personalId,
    baseSalary,
    travelAllowance,
    mealAllowance,
    phoneAllowance,
    carAllowance,
    extraHoursBonus,
    nonCompetitionBonus,
    otherAllowances,
    maxAnnualVectionDays,
    maxAnnualSickDays,
    maxAnnualConvalescenceDays,
    contributionRates,
    otherDetails
  } = req.body;

  if (!firstName || !lastName || !role || !startDate || !personalId) {
    return res.status(400).json({ message: 'Required fields are missing.' });
  }

  try {
    const existing = await db.collection('workers').findOne({ personalId });
    if (existing) {
      return res.status(409).json({ message: 'Worker already exists.' });
    }

    const result = await db.collection('workers').insertOne({
      firstName,
      lastName,
      address,
      role,
      department,
      startDate,
      email,
      phone,
      personalId,
      baseSalary: parseFloat(baseSalary) || 0,
      travelAllowance: parseFloat(travelAllowance) || 0,
      mealAllowance: parseFloat(mealAllowance) || 0,
      phoneAllowance: parseFloat(phoneAllowance) || 0,
      carAllowance: parseFloat(carAllowance) || 0,
      extraHoursBonus: parseFloat(extraHoursBonus) || 0,
      nonCompetitionBonus: parseFloat(nonCompetitionBonus) || 0,
      otherAllowances: parseFloat(otherAllowances) || 0,
      maxAnnualVectionDays: parseInt(maxAnnualVectionDays) || 0,
      maxAnnualSickDays: parseInt(maxAnnualSickDays) || 0,
      maxAnnualConvalescenceDays: parseInt(maxAnnualConvalescenceDays) || 0,
      contributionRates: {
        employeeSeverance: parseFloat(contributionRates?.employeeSeverance) || 0,
        employerSeverance: parseFloat(contributionRates?.employerSeverance) || 0,
        employeePension: parseFloat(contributionRates?.employeePension) || 0,
        employerPension: parseFloat(contributionRates?.employerPension) || 0,
        employeeEducationFund: parseFloat(contributionRates?.employeeEducationFund) || 0,
        employerEducationFund: parseFloat(contributionRates?.employerEducationFund) || 0
      },
      otherDetails,
      createdAt: new Date()
    });

    res.status(201).json({ message: 'Worker added', workerId: result.insertedId });
  } catch (err) {
    console.error('Create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET one worker by personalId
router.get('/get-user-by-personalId/:personalId', async (req, res) => {
  const db = req.db;
  const { personalId } = req.params;

  try {
    const worker = await db.collection('workers').findOne({ personalId });
    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    res.json(worker);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  const db = req.db;
  const { id } = req.params;

  try {
    const worker = await db.collection('workers').findOne({ _id: new ObjectId(id) });
    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    res.json(worker);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all workers
router.get('/', async (req, res) => {
  const db = req.db;

  try {
    const workers = await db.collection('workers').find({}).toArray();
    res.json(workers);
  } catch (err) {
    console.error('Get all error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE worker by ID
router.put('/:id', async (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const updateData = { ...req.body };

  // Remove fields that shouldn't be updated directly
  delete updateData._id;
  delete updateData.createdAt;
  delete updateData.contractPath;

  try {
    // Parse numeric values
    if (updateData.baseSalary) updateData.baseSalary = parseFloat(updateData.baseSalary);
    if (updateData.travelAllowance) updateData.travelAllowance = parseFloat(updateData.travelAllowance);
    if (updateData.mealAllowance) updateData.mealAllowance = parseFloat(updateData.mealAllowance);
    if (updateData.phoneAllowance) updateData.phoneAllowance = parseFloat(updateData.phoneAllowance);
    if (updateData.carAllowance) updateData.carAllowance = parseFloat(updateData.carAllowance);
    if (updateData.extraHoursBonus) updateData.extraHoursBonus = parseFloat(updateData.extraHoursBonus);
    if (updateData.nonCompetitionBonus) updateData.nonCompetitionBonus = parseFloat(updateData.nonCompetitionBonus);
    if (updateData.otherAllowances) updateData.otherAllowances = parseFloat(updateData.otherAllowances);
    
    // Parse integer values for days
    if (updateData.maxAnnualVectionDays) updateData.maxAnnualVectionDays = parseInt(updateData.maxAnnualVectionDays);
    if (updateData.maxAnnualSickDays) updateData.maxAnnualSickDays = parseInt(updateData.maxAnnualSickDays);
    if (updateData.maxAnnualConvalescenceDays) updateData.maxAnnualConvalescenceDays = parseInt(updateData.maxAnnualConvalescenceDays);

    // Handle contribution rates
    if (updateData.contributionRates) {
      updateData.contributionRates = {
        employeeSeverance: parseFloat(updateData.contributionRates.employeeSeverance) || 0,
        employerSeverance: parseFloat(updateData.contributionRates.employerSeverance) || 0,
        employeePension: parseFloat(updateData.contributionRates.employeePension) || 0,
        employerPension: parseFloat(updateData.contributionRates.employerPension) || 0,
        employeeEducationFund: parseFloat(updateData.contributionRates.employeeEducationFund) || 0,
        employerEducationFund: parseFloat(updateData.contributionRates.employerEducationFund) || 0
      };
    }

    const result = await db.collection('workers').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    res.json({ message: 'Worker updated' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE worker by personalId
router.delete('/:personalId', async (req, res) => {
  const db = req.db;
  const { personalId } = req.params;

  try {
    const result = await db.collection('workers').deleteOne({ personalId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    res.json({ message: 'Worker deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload contract
router.post('/:id/upload-contract', upload.single('contract'), async (req, res) => {
    const db = req.db;
    const { id } = req.params;

    if (!req.file) {
        return res.status(400).json({ 
            message: 'לא נבחר קובץ להעלאה',
            messageEn: 'No file uploaded'
        });
    }

    try {
        // Check if worker exists
        const worker = await db.collection('workers').findOne({ _id: new ObjectId(id) });
        if (!worker) {
            return res.status(404).json({ message: 'Worker not found' });
        }

        // Parse the contract to extract worker information
        const parsedData = await parseWorkerFromPDF(req.file.path);

        // Return the parsed data for review
        res.json({ 
            message: 'החוזה הועלה ונותח בהצלחה',
            messageEn: 'Contract uploaded and analyzed successfully',
            contractPath: req.file.path,
            parsedData: parsedData,
            currentData: worker // Include current worker data for comparison
        });
    } catch (err) {
        console.error('Contract upload error:', err);
        res.status(500).json({ 
            message: 'שגיאה בהעלאת או ניתוח החוזה',
            messageEn: 'Failed to upload or analyze contract',
            error: err.message 
        });
    }
});

// New endpoint to save reviewed contract data
router.post('/:id/save-contract-data', async (req, res) => {
    const db = req.db;
    const { id } = req.params;
    const { contractPath, parsedData } = req.body;

    try {
        // Update worker with new contract path and parsed data
        const updateData = {
            contractPath: contractPath,
            // Update only the fields that are present in the parsed data
            ...(parsedData.address && { address: parsedData.address }),
            ...(parsedData.role && { role: parsedData.role }),
            ...(parsedData.department && { department: parsedData.department }),
            ...(parsedData.email && { email: parsedData.email }),
            ...(parsedData.phone && { phone: parsedData.phone }),
            ...(parsedData.baseSalary && { baseSalary: parsedData.baseSalary }),
            ...(parsedData.travelAllowance && { travelAllowance: parsedData.travelAllowance }),
            ...(parsedData.mealAllowance && { mealAllowance: parsedData.mealAllowance }),
            ...(parsedData.phoneAllowance && { phoneAllowance: parsedData.phoneAllowance }),
            ...(parsedData.carAllowance && { carAllowance: parsedData.carAllowance }),
            ...(parsedData.extraHoursBonus && { extraHoursBonus: parsedData.extraHoursBonus }),
            ...(parsedData.nonCompetitionBonus && { nonCompetitionBonus: parsedData.nonCompetitionBonus }),
            ...(parsedData.otherAllowances && { otherAllowances: parsedData.otherAllowances }),
            ...(parsedData.maxAnnualVectionDays && { maxAnnualVectionDays: parsedData.maxAnnualVectionDays }),
            ...(parsedData.maxAnnualSickDays && { maxAnnualSickDays: parsedData.maxAnnualSickDays }),
            ...(parsedData.maxAnnualConvalescenceDays && { maxAnnualConvalescenceDays: parsedData.maxAnnualConvalescenceDays }),
            ...(parsedData.contributionRates && { contributionRates: parsedData.contributionRates })
        };

        await db.collection('workers').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        res.json({ 
            message: 'הנתונים עודכנו בהצלחה',
            messageEn: 'Data updated successfully',
            updatedData: updateData
        });
    } catch (err) {
        console.error('Save contract data error:', err);
        res.status(500).json({ 
            message: 'שגיאה בשמירת הנתונים',
            messageEn: 'Failed to save data',
            error: err.message 
        });
    }
});

module.exports = router;