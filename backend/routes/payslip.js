const express = require("express");
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { generatePayslip } = require("../services/payslipService");
const { sendPayslipEmail } = require("../services/emailService");
const { ObjectId } = require('mongodb');
const wkhtmltopdf = require('wkhtmltopdf');

// Create documents directory at the backend root
const documentsDir = path.join(__dirname, '..', 'documents');
if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
}

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Helper function to generate PDF
async function generatePDF(data, templatePath, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            // Read the template
            const template = fs.readFileSync(templatePath, 'utf8');
            
            // Format currency values
            const formattedData = {
                ...data,
                payments: {
                    ...data.payments,
                    baseSalary: formatCurrency(data.payments.baseSalary),
                    travelExpenses: formatCurrency(data.payments.travelExpenses),
                    carValue: formatCurrency(data.payments.carValue),
                    phoneValue: formatCurrency(data.payments.phoneValue),
                    mealsValue: formatCurrency(data.payments.mealsValue),
                    monthlyBonus: formatCurrency(data.payments.monthlyBonus),
                    totalPayments: formatCurrency(data.payments.totalPayments)
                },
                mandatoryDeductions: {
                    ...data.mandatoryDeductions,
                    incomeTax: formatCurrency(data.mandatoryDeductions.incomeTax),
                    nationalInsurance: formatCurrency(data.mandatoryDeductions.nationalInsurance),
                    healthTax: formatCurrency(data.mandatoryDeductions.healthTax),
                    total: formatCurrency(data.mandatoryDeductions.total)
                },
                pensionDeductions: {
                    ...data.pensionDeductions,
                    employeePension: formatCurrency(data.pensionDeductions.employeePension),
                    employerPension: formatCurrency(data.pensionDeductions.employerPension),
                    employeeFund: formatCurrency(data.pensionDeductions.employeeFund),
                    employerFund: formatCurrency(data.pensionDeductions.employerFund),
                    employerSeverance: formatCurrency(data.pensionDeductions.employerSeverance),
                    totalEmployeeDeductions: formatCurrency(data.pensionDeductions.totalEmployeeDeductions),
                    totalEmployerContributions: formatCurrency(data.pensionDeductions.totalEmployerContributions)
                },
                summary: {
                    ...data.summary,
                    totalGross: formatCurrency(data.summary.totalGross),
                    totalDeductions: formatCurrency(data.summary.totalDeductions),
                    totalNet: formatCurrency(data.summary.totalNet)
                }
            };

            // Replace the script section with direct data injection
            const htmlContent = template.replace(
                '<script>',
                `<script>
                window.addEventListener('DOMContentLoaded', function() {
                    const data = ${JSON.stringify(formattedData)};
                    loadPayslipData(data);
                });`
            );

            // Create a temporary HTML file
            const tempHtmlPath = path.join(documentsDir, `temp_${Date.now()}.html`);
            fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

            // Generate PDF using wkhtmltopdf
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
            .pipe(fs.createWriteStream(outputPath))
            .on('finish', () => {
                // Clean up temporary file
                fs.unlinkSync(tempHtmlPath);
                resolve(true);
            })
            .on('error', (err) => {
                console.error('Error generating PDF:', err);
                // Clean up temporary file
                if (fs.existsSync(tempHtmlPath)) {
                    fs.unlinkSync(tempHtmlPath);
                }
                reject(err);
            });
        } catch (error) {
            console.error('Error in PDF generation:', error);
            reject(error);
        }
    });
}

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

        // Save payslip to payslips collection
        const payslipResult = await db.collection("payslips").insertOne({
            ...payslip,
            personalId: worker.personalId,
            companyCode: worker.companyCode,
            createdAt: new Date()
        });

        // Generate PDF file
        const filename = `payslip_${worker._id}_${Date.now()}.pdf`;
        const filePath = path.join(documentsDir, filename);
        
        // Save PDF file (assuming generatePayslip creates the PDF)
        await fs.promises.writeFile(filePath, payslip.pdfBuffer);

        // Save to documents collection
        const documentRecord = {
            employeeId: worker._id,
            type: 'payslips',
            title: `תלוש שכר - ${new Date().toLocaleDateString('he-IL')}`,
            date: new Date(),
            filename: filename,
            originalName: `תלוש שכר - ${worker.firstName} ${worker.lastName} - ${new Date().toLocaleDateString('he-IL')}.pdf`,
            payslipId: payslipResult.insertedId
        };

        await db.collection("documents").insertOne(documentRecord);

        res.json({
            ...payslip,
            _id: payslipResult.insertedId,
            documentId: documentRecord._id
        });
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

        // Get the document record to attach to email
        const document = await db.collection("documents").findOne({
            payslipId: new ObjectId(payslipId)
        });

        if (!document) {
            return res.status(404).send("קובץ התלוש לא נמצא");
        }

        const filePath = path.join(documentsDir, document.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send("קובץ התלוש לא נמצא במערכת");
        }

        const emailResult = await sendPayslipEmail(worker.email, payslip, filePath);
        res.json({ 
            success: true,
            previewUrl: emailResult.previewUrl
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message || "שגיאה בשליחת התלוש במייל");
    }
});

// Get payslips for an employee
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const db = req.db;

    try {
        const employee = await db.collection('workers').findOne({
            _id: new ObjectId(id)
        });

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const payslips = await db.collection('payslips')
            .find({ personalId: employee.personalId })
            .sort({ createdAt: -1 })
            .toArray();

        // Check and create missing document records
        for (const payslip of payslips) {
            const existingDoc = await db.collection('documents').findOne({
                payslipId: payslip._id
            });

            if (!existingDoc) {
                // Create document record
                const filename = `payslip_${employee._id}_${payslip.createdAt.getTime()}.pdf`;
                const documentRecord = {
                    employeeId: employee._id,
                    type: 'payslips',
                    title: `תלוש שכר - ${payslip.payslip.month}`,
                    date: payslip.createdAt,
                    filename: filename,
                    originalName: `תלוש שכר - ${employee.firstName} ${employee.lastName} - ${payslip.payslip.month}.pdf`,
                    payslipId: payslip._id
                };

                await db.collection('documents').insertOne(documentRecord);

                // Generate PDF file if it doesn't exist
                const filePath = path.join(documentsDir, filename);
                if (!fs.existsSync(filePath)) {
                    const templatePath = path.join(__dirname, '..', 'templates', 'payslip_template.html');
                    const success = await generatePDF(payslip, templatePath, filePath);
                    
                    if (!success) {
                        console.error(`Failed to generate PDF for payslip ${payslip._id}`);
                        // Remove the document record if PDF generation failed
                        await db.collection('documents').deleteOne({ _id: documentRecord._id });
                    }
                }
            }
        }

        res.json(payslips);
    } catch (error) {
        console.error('Error fetching payslips:', error);
        res.status(500).json({ message: 'Failed to fetch payslips' });
    }
});

// Download a specific payslip
router.get('/:employeeId/:payslipId/download', async (req, res) => {
    const { employeeId, payslipId } = req.params;
    const db = req.db;

    try {
        const employee = await db.collection('workers').findOne({
            _id: new ObjectId(employeeId)
        });

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const payslip = await db.collection('payslips').findOne({
            _id: new ObjectId(payslipId),
            personalId: employee.personalId
        });

        if (!payslip) {
            return res.status(404).json({ message: 'Payslip not found' });
        }

        // Get the document record for this payslip
        const document = await db.collection('documents').findOne({
            payslipId: new ObjectId(payslipId)
        });

        if (!document) {
            return res.status(404).json({ message: 'Payslip document not found' });
        }

        const filePath = path.join(documentsDir, document.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Payslip file not found' });
        }

        res.download(filePath, document.originalName);
    } catch (error) {
        console.error('Error downloading payslip:', error);
        res.status(500).json({ message: 'Failed to download payslip' });
    }
});

// Preview a specific payslip
router.get('/:employeeId/:payslipId/preview', async (req, res) => {
    const { employeeId, payslipId } = req.params;
    const db = req.db;

    try {
        const employee = await db.collection('workers').findOne({
            _id: new ObjectId(employeeId)
        });

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const payslip = await db.collection('payslips').findOne({
            _id: new ObjectId(payslipId)
        });

        if (!payslip) {
            return res.status(404).json({ message: 'Payslip not found' });
        }

        // Create documents directory if it doesn't exist
        if (!fs.existsSync(documentsDir)) {
            fs.mkdirSync(documentsDir, { recursive: true });
        }

        // Define the filename using a consistent format
        const filename = `payslip_${employeeId}_${payslipId}.pdf`;
        const filePath = path.join(documentsDir, filename);

        // Check if file exists, if not generate it
        if (!fs.existsSync(filePath)) {
            try {
                // Load the template
                const templatePath = path.join(__dirname, '..', 'templates', 'payslip_template.html');
                const template = fs.readFileSync(templatePath, 'utf8');

                // Replace the script section with direct data injection
                const htmlContent = template.replace(
                    '<script>',
                    `<script>
                    window.addEventListener('DOMContentLoaded', function() {
                        const data = ${JSON.stringify(payslip)};
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
                await new Promise((resolve, reject) => {
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
                    .pipe(fs.createWriteStream(filePath))
                    .on('finish', () => {
                        // Clean up temporary file
                        fs.unlinkSync(tempHtmlPath);
                        resolve();
                    })
                    .on('error', (err) => {
                        // Clean up temporary file
                        if (fs.existsSync(tempHtmlPath)) {
                            fs.unlinkSync(tempHtmlPath);
                        }
                        reject(err);
                    });
                });

                // Create or update document record
                const documentRecord = {
                    employeeId: new ObjectId(employeeId),
                    type: 'payslips',
                    title: `תלוש שכר - ${payslip.payslip.month}`,
                    date: payslip.createdAt,
                    filename: filename,
                    originalName: `תלוש שכר - ${employee.firstName} ${employee.lastName} - ${payslip.payslip.month}.pdf`,
                    payslipId: new ObjectId(payslipId)
                };

                await db.collection('documents').updateOne(
                    { payslipId: new ObjectId(payslipId) },
                    { $set: documentRecord },
                    { upsert: true }
                );
            } catch (error) {
                console.error('Error generating PDF:', error);
                return res.status(500).json({ message: 'Failed to generate payslip PDF' });
            }
        }

        // Set appropriate headers for PDF preview
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="payslip.pdf"`);

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('Error streaming payslip file:', error);
            if (!res.headersSent) {
                res.status(500).json({ 
                    message: 'Error streaming payslip file',
                    error: error.message
                });
            }
        });
    } catch (error) {
        console.error('Error previewing payslip:', error);
        res.status(500).json({ 
            message: 'Failed to preview payslip',
            error: error.message
        });
    }
});

module.exports = router;