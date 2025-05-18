const wkhtmltopdf = require('wkhtmltopdf');
const path = require('path');
const fs = require('fs');
const payslipCalculator = require('./payslipCalculator');

async function generatePayslip(worker, payData, db) {
    try {
        // Get the calculated payslip data from the calculator
        const calculatedData = await payslipCalculator.calculatePayslip(worker, payData, db);

        // Prepare the data structure that matches our template
        const payslipData = {
            company: {
                name: 'WiseWage',
                address: 'הברזל 3',
                city: 'תל אביב',
                taxFile: '123456789',
                id: '515151515'
            },
            employeeDetails: {
                fullName: `${worker.firstName} ${worker.lastName}`,
                role: worker.role,
                department: worker.department,
                personalId: worker.personalId,
                startDate: new Date(worker.startDate).toLocaleDateString('he-IL'),
                employeeNumber: worker.employeeId,
                healthCare: worker.healthProvider,
                taxPoints: payData.creditPoints
            },
            bank: {
                bankName: worker.bankDetails?.bankName || '',
                branch: worker.bankDetails?.branch || '',
                accountNumber: worker.bankDetails?.accountNumber || ''
            },
            payments: {
                baseSalary: calculatedData.salary,
                travelExpenses: calculatedData.travelAllowance || 0,
                carValue: calculatedData.carAllowance || 0,
                phoneValue: calculatedData.phoneAllowance || 0,
                mealsValue: calculatedData.mealsAllowance || 0,
                monthlyBonus: calculatedData.monthlyBonus || 0,
                totalPayments: calculatedData.totalGross
            },
            mandatoryDeductions: {
                incomeTax: calculatedData.incomeTax,
                nationalInsurance: calculatedData.nationalInsurance,
                healthTax: calculatedData.healthInsurance,
                total: calculatedData.totalMandatoryDeductions
            },
            pensionDeductions: {
                employeePension: calculatedData.employeePension,
                employerPension: calculatedData.employerPension,
                employeeFund: calculatedData.employeeFund,
                employerFund: calculatedData.employerFund,
                employerSeverance: calculatedData.employerSeverance,
                totalEmployeeDeductions: calculatedData.totalEmployeeDeductions,
                totalEmployerContributions: calculatedData.totalEmployerContributions
            },
            absences: calculatedData.absences,
            summary: {
                totalGross: calculatedData.totalGross,
                totalDeductions: calculatedData.totalDeductions,
                totalNet: calculatedData.totalNet
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