const payslipCalculator = require('./payslipCalculator');

async function generatePayslip(worker, input, db) {
    try {
        return await payslipCalculator.generatePayslip(worker, input, db);
    } catch (error) {
        console.error("Error generating payslip:", error);
        throw new Error("שגיאה בחישוב תלוש השכר");
    }
}

module.exports = { generatePayslip };