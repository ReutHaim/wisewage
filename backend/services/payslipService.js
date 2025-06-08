const wkhtmltopdf = require('wkhtmltopdf');
const path = require('path');
const fs = require('fs');
const payslipCalculator = require('./payslipCalculator');

async function generatePayslip(worker, payData, db) {
    try {
        // Get the calculated payslip data from the calculator
        const calculatedData = await payslipCalculator.generatePayslip(worker, payData, db);

        // Prepare the data structure that matches our template
        const payslipData = {
            company: calculatedData.company,
            employeeDetails: {
                fullName: `${worker.firstName} ${worker.lastName}`,
                role: worker.role || '',
                department: worker.department || '',
                personalId: worker.personalId,
                startDate: worker.startDate ? new Date(worker.startDate).toLocaleDateString('he-IL') : '',
                employeeNumber: worker.employeeNumber || worker.personalId,
                healthCare: worker.healthCare || '',
                taxPoints: payData.creditPoints
            },
            bank: {
                bankName: worker.bankAccount?.bankName || '',
                branch: worker.bankAccount?.branch || '',
                accountNumber: worker.bankAccount?.accountNumber || ''
            },
            payments: {
                baseSalary: calculatedData.payments.baseSalary,
                travelExpenses: calculatedData.payments.travelExpenses,
                carValue: calculatedData.payments.carValue,
                phoneValue: calculatedData.payments.phoneValue,
                mealsValue: calculatedData.payments.mealsValue,
                monthlyBonus: calculatedData.payments.monthlyBonus,
                totalPayments: calculatedData.payments.totalPayments
            },
            mandatoryDeductions: {
                incomeTax: calculatedData.mandatoryDeductions.incomeTax,
                nationalInsurance: calculatedData.mandatoryDeductions.nationalInsurance,
                healthTax: calculatedData.mandatoryDeductions.healthTax,
                total: calculatedData.mandatoryDeductions.total
            },
            pensionDeductions: {
                employeePension: calculatedData.pensionDeductions.employeePension,
                employerPension: calculatedData.pensionDeductions.employerPension,
                employeeFund: calculatedData.pensionDeductions.employeeFund,
                employerFund: calculatedData.pensionDeductions.employerFund,
                employerSeverance: calculatedData.pensionDeductions.employerSeverance,
                totalEmployeeDeductions: calculatedData.pensionDeductions.totalEmployeeDeductions,
                totalEmployerContributions: calculatedData.pensionDeductions.totalEmployerContributions
            },
            absences: {
                vacation: {
                    previous: 0,
                    current: 1,
                    used: Number(payData.vacationDays || 0),
                    balance: 0
                },
                sick: {
                    previous: 0,
                    current: 1.5,
                    used: Number(payData.sickDays || 0),
                    balance: 0
                }
            },
            summary: {
                totalGross: calculatedData.summary.totalGross,
                totalDeductions: calculatedData.summary.totalDeductions,
                totalNet: calculatedData.summary.totalNet
            },
            payslip: {
                month: new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
            }
        };

        // Load the template
        const templatePath = path.join(__dirname, '..', 'templates', 'payslip_template.html');
        const template = fs.readFileSync(templatePath, 'utf8');

        // Replace the script section with direct data injection
        const htmlContent = template.replace(
            '<script>',
            `<script>
            window.addEventListener('DOMContentLoaded', function() {
                const data = ${JSON.stringify(payslipData)};
                loadPayslipData(data);
            });`
        );

        // Create a temporary file
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempHtmlPath = path.join(tempDir, `temp_${Date.now()}.html`);
        fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

        // Generate PDF using wkhtmltopdf
        return new Promise((resolve, reject) => {
            const chunks = [];
            wkhtmltopdf(fs.createReadStream(tempHtmlPath), {
                pageSize: 'A4',
                orientation: 'Portrait',
                marginTop: '20',
                marginRight: '20',
                marginBottom: '20',
                marginLeft: '20',
                encoding: 'utf-8',
                enableLocalFileAccess: true,
                javascriptDelay: 1000
            })
            .on('data', chunk => chunks.push(chunk))
            .on('end', () => {
                // Clean up temporary file
                fs.unlinkSync(tempHtmlPath);
                const pdfBuffer = Buffer.concat(chunks);
                resolve({
                    ...payslipData,
                    pdfBuffer
                });
            })
            .on('error', (err) => {
                // Clean up temporary file
                if (fs.existsSync(tempHtmlPath)) {
                    fs.unlinkSync(tempHtmlPath);
                }
                reject(err);
            });
        });
    } catch (error) {
        console.error("Error generating payslip:", error);
        throw new Error("שגיאה בהפקת תלוש השכר");
    }
}

module.exports = {
    generatePayslip
};