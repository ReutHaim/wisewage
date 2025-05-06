const express = require("express");
const router = express.Router();
const { generatePayslip } = require("../services/payslipService");

router.post("/", async (req, res) => {
    try {
        const { employeeName, workHours, vacationDays, sickDays, monthlyBonus } = req.body;

        const db = req.db;
        const [firstName, lastName] = employeeName.split(' ');

        const worker = await db.collection("workers").findOne({ firstName, lastName });

        if (!worker) {
            return res.status(404).send("Worker not found");
        }

        const payslip = await generatePayslip(worker, {
            workHours,
            vacationDays,
            sickDays,
            monthlyBonus
        });

        await db.collection("payslips").insertOne({ ...payslip, personalId: worker.personalId, createdAt: new Date() });

        res.json(payslip);
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to generate payslip");
    }
});

module.exports = router;