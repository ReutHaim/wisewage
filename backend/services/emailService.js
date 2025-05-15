const nodemailer = require('nodemailer');

async function createTestAccount() {
    const testAccount = await nodemailer.createTestAccount();
    
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });

    console.log('Test Account Created:', {
        user: testAccount.user,
        pass: testAccount.pass
    });

    return transporter;
}

let etherealTransporter = null;

async function sendPayslipEmail(recipientEmail, payslipData) {
    try {
        if (!etherealTransporter) {
            etherealTransporter = await createTestAccount();
        }

        console.log('Attempting to send email to:', recipientEmail);
        
        const mailOptions = {
            from: {
                name: 'WiseWage System',
                address: 'system@wisewage.com'
            },
            to: {
                name: payslipData.employeeDetails.fullName,
                address: recipientEmail
            },
            subject: `תלוש שכר - ${payslipData.payslip.month}`,
            html: `
                <div dir="rtl" style="font-family: Arial, sans-serif;">
                    <h2>תלוש השכר שלך</h2>
                    <p>שלום ${payslipData.employeeDetails.fullName},</p>
                    <p>מצורף תלוש השכר שלך לחודש ${payslipData.payslip.month}.</p>
                    <p>סיכום תלוש:</p>
                    <ul>
                        <li>שכר ברוטו: ${payslipData.summary.totalGross} ₪</li>
                        <li>ניכויים: ${payslipData.summary.totalDeductions} ₪</li>
                        <li>שכר נטו: ${payslipData.summary.totalNet} ₪</li>
                    </ul>
                    <p>בברכה,<br>${payslipData.company.name}</p>
                </div>
            `,
            headers: {
                'Content-Type': 'text/html; charset=UTF-8'
            }
        };

        const info = await etherealTransporter.sendMail(mailOptions);
        
        console.log('Email sent successfully!');
        console.log('Preview URL: ' + nodemailer.getTestMessageUrl(info));
        
        return { 
            success: true, 
            messageId: info.messageId,
            previewUrl: nodemailer.getTestMessageUrl(info)
        };
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send payslip email: ' + error.message);
    }
}

module.exports = { sendPayslipEmail }; 