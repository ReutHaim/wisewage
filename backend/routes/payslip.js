const express = require("express");
const router = express.Router();
const { generatePayslip } = require("../services/payslipService");
const { sendPayslipEmail } = require("../services/emailService");
const { ObjectId } = require('mongodb');

router.post("/", async (req, res) => {
    try {
        const { employeeName, workHours, vacationDays, sickDays, monthlyBonus, creditPoints, workingDays } = req.body;

        const db = req.db;
        const [firstName, lastName] = employeeName.split(' ');

        const worker = await db.collection("workers").findOne({ firstName, lastName });

        if (!worker) {
            return res.status(404).send("Worker not found");
        }

        // If worker doesn't have a company code, assign the default mock company
        if (!worker.companyCode) {
            worker.companyCode = 'COMP001';
        }

        const payslip = await generatePayslip(worker, {
            workHours,
            vacationDays,
            sickDays,
            monthlyBonus,
            creditPoints,
            workingDays
        }, db);

        const result = await db.collection("payslips").insertOne({
            ...payslip,
            personalId: worker.personalId,
            companyCode: worker.companyCode,
            createdAt: new Date()
        });

        // Add the MongoDB _id to the payslip object
        payslip._id = result.insertedId;

        res.json(payslip);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message || "Failed to generate payslip");
    }
});

// Send payslip by email
router.post("/send-email", async (req, res) => {
    try {
        const { employeeName, payslipId } = req.body;
        const db = req.db;

        if (!payslipId) {
            return res.status(400).send("Payslip ID is required");
        }

        // Find the worker
        const [firstName, lastName] = employeeName.split(' ');
        const worker = await db.collection("workers").findOne({ firstName, lastName });

        if (!worker) {
            return res.status(404).send("Worker not found");
        }

        if (!worker.email) {
            return res.status(400).send("Worker does not have an email address");
        }

        const payslip = await db.collection("payslips").findOne({ _id: new ObjectId(payslipId) });
        if (!payslip) {
            return res.status(404).send("Payslip not found");
        }

        // Send the email
        const emailResult = await sendPayslipEmail(worker.email, payslip);
        res.json({ 
            success: true,
            previewUrl: emailResult.previewUrl
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message || "Failed to send email");
    }
});

module.exports = router;