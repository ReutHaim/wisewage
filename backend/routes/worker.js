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
    maxAnnualVectionDays,
    maxAnnualSickDays,
    maxAnnualConvalescenceDays,
    contributionRates,
    otherAllowances,
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
      baseSalary,
      travelAllowance,
      mealAllowance,
      phoneAllowance,
      carAllowance,
      maxAnnualVectionDays,
      maxAnnualSickDays,
      maxAnnualConvalescenceDays,
      contributionRates: contributionRates || {
        employeeSeverance: 6.0,
        employerSeverance: 8.33,
        employeePension: 6.0,
        employerPension: 6.5,
        employeeEducationFund: 2.5,
        employerEducationFund: 7.5
      },
      otherAllowances,
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
  const updateData = req.body;

  // Remove fields that shouldn't be updated directly
  delete updateData._id;
  delete updateData.createdAt;
  delete updateData.contractPath;

  try {
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