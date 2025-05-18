const express = require("express");
const router = express.Router();
const { generatePayslip } = require("../services/payslipService");
const { sendPayslipEmail } = require("../services/emailService");
const { ObjectId } = require('mongodb');

router.post("/", async (req, res) => {
    try {
        const { employeeName, workHours, vacationDays, sickDays, monthlyBonus, creditPoints, workingDays } = req.body;

        const db = req.db;
        const nameParts = employeeName.trim().split(/\s+/).filter(Boolean);
        
        let worker;
        if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(" ");
            
            const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const firstNameRegex = escapeRegex(firstName);
            const lastNameRegex = escapeRegex(lastName);

            worker = await db.collection("workers").findOne({
                firstName: { $regex: new RegExp(`^${firstNameRegex}$`, 'i') },
                lastName: { $regex: new RegExp(`^${lastNameRegex}$`, 'i') }
            });
        }

        if (!worker) {
            return res.status(404).send("העובד לא נמצא");
        }

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

        payslip._id = result.insertedId;

        res.json(payslip);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message || "שגיאה בהפקת תלוש השכר");
    }
});

// Send payslip by email
router.post("/send-email", async (req, res) => {
    try {
        const { employeeName, payslipId } = req.body;
        const db = req.db;

        if (!payslipId) {
            return res.status(400).send("נדרש מזהה תלוש");
        }

        const nameParts = employeeName.trim().split(/\s+/).filter(Boolean);
        
        let worker;
        if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(" ");
            
            const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const firstNameRegex = escapeRegex(firstName);
            const lastNameRegex = escapeRegex(lastName);

            worker = await db.collection("workers").findOne({
                firstName: { $regex: new RegExp(`^${firstNameRegex}$`, 'i') },
                lastName: { $regex: new RegExp(`^${lastNameRegex}$`, 'i') }
            });
        }

        if (!worker) {
            return res.status(404).send("העובד לא נמצא");
        }

        if (!worker.email) {
            return res.status(400).send("לעובד אין כתובת דואר אלקטרוני");
        }

        const payslip = await db.collection("payslips").findOne({ _id: new ObjectId(payslipId) });
        if (!payslip) {
            return res.status(404).send("התלוש לא נמצא");
        }

        const emailResult = await sendPayslipEmail(worker.email, payslip);
        res.json({ 
            success: true,
            previewUrl: emailResult.previewUrl
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message || "שגיאה בשליחת התלוש במייל");
    }
});

module.exports = router;