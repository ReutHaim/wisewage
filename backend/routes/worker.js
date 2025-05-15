const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();


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

// UPDATE worker by personalId
router.put('/:personalId', async (req, res) => {
  const db = req.db;
  const { personalId } = req.params;
  const updateData = { ...req.body };

  // Remove fields that shouldn't be updated directly
  delete updateData._id;
  delete updateData.createdAt;
  delete updateData.contractPath;
  delete updateData.personalId;

  // Remove any top-level contribution rate fields that should only be in contributionRates object
  delete updateData.employeeSeverance;
  delete updateData.employerSeverance;
  delete updateData.employeePension;
  delete updateData.employerPension;
  delete updateData.employeeEducationFund;
  delete updateData.employerEducationFund;

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
      { personalId },
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

module.exports = router;