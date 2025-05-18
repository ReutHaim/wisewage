let selectedEmployee = '';
let currentPayslip = null;

async function fetchAndDisplayEmployees() {
    try {
        const apiUrl = window.location.hostname === 'vmedu421.mtacloud.co.il'
            ? '/api/workers'  // Use relative path in production
            : 'http://localhost:3000/api/workers';

        const response = await fetch(apiUrl);
        const workers = await response.json();
        const container = document.getElementById('employeeListContainer');
        container.innerHTML = '';

        workers.forEach(worker => {
            const fullName = `${worker.firstName} ${worker.lastName}`;
            const div = document.createElement('div');
            div.className = 'employee-item';
            div.textContent = fullName;
            div.onclick = () => selectEmployee(fullName, div);
            container.appendChild(div);
        });
    } catch (err) {
        console.error('Error fetching employees:', err);
    }
}

function selectEmployee(name, element) {
    // Remove selected class from all employee items
    document.querySelectorAll('.employee-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add selected class to clicked element
    element.classList.add('selected');
    
    selectedEmployee = name;
    document.querySelector('.payroll-form').style.display = 'block';
    document.querySelector('.payroll-form h3').innerText = `הזנת נתוני שכר עבור ${name}`;
    document.getElementById('payslipContainer').innerHTML = `
        <div class="payslip-actions" style="display: none"></div>
        <div id="payslipContent"></div>
    `;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

async function displayPayslip(payslip) {
    try {
        const templateUrl = window.location.hostname === 'vmedu421.mtacloud.co.il'
            ? '/templates/payslip_template.html'
            : 'http://localhost:3000/templates/payslip_template.html';

        // Fetch template first
        const response = await fetch(templateUrl);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
        }
        
        let template = await response.text();
        
        // Add the payslip data initialization script
        const dataScript = `
            <script>
                window.onload = function() {
                    const payslipData = ${JSON.stringify(payslip)};
                    loadPayslipData(payslipData);
                    document.getElementById('payslipId').value = '${payslip._id}';
                }
            </script>
        `;
        
        // Insert the data script right before the closing </body> tag
        template = template.replace('</body>', `${dataScript}</body>`);
        
        // Now open the window with the complete content
        const newWindow = window.open('', '_blank');
        newWindow.document.open();
        newWindow.document.write(template);
        newWindow.document.close();
        
    } catch (error) {
        console.error('Error displaying payslip:', error);
        alert('שגיאה בטעינת תבנית התלוש');
    }
}

async function generatePayslip() {
    if (!selectedEmployee) {
        alert('נא לבחור עובד');
        return;
    }

    // Get form values and ensure they are valid numbers
    const workingDays = Number(document.getElementById('workingDays').value) || 0;
    const creditPoints = Number(document.getElementById('creditPoints').value) || 0;
    const workHours = Number(document.getElementById('workHours').value) || 0;
    const vacationDays = Number(document.getElementById('vacationDays').value) || 0;
    const sickDays = Number(document.getElementById('sickDays').value) || 0;
    const monthlyBonus = Number(document.getElementById('monthlyBonus').value) || 0;

    // Validate that required fields are not zero
    if (!workingDays) {
        alert('נא להזין מספר ימי עבודה');
        return;
    }

    if (!creditPoints) {
        alert('נא להזין נקודות זיכוי');
        return;
    }

    try {
        const response = await fetch('/api/payslips', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                employeeName: selectedEmployee,
                workingDays,
                creditPoints,
                workHours,
                vacationDays,
                sickDays,
                monthlyBonus
            })
        });

        if (!response.ok) {
            throw new Error('שגיאה בהפקת תלוש');
        }

        const payslip = await response.json();
        currentPayslip = payslip;
        displayPayslip(payslip);
        document.querySelector('.payslip-actions').style.display = 'flex';
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

async function sendPayslipByEmail() {
    if (!currentPayslip) {
        alert('נא להפיק תלוש תחילה');
        return;
    }

    try {
        const apiUrl = window.location.hostname === 'vmedu421.mtacloud.co.il'
            ? '/api/payslips/send-email'
            : 'http://localhost:3000/api/payslips/send-email';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employeeName: selectedEmployee,
                payslipId: currentPayslip._id
            })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.previewUrl) {
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    z-index: 1000;
                    direction: rtl;
                    text-align: center;
                    min-width: 300px;
                `;

                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 999;
                `;

                modal.innerHTML = `
                    <h3 style="margin-bottom: 15px;">תלוש השכר נשלח בהצלחה!</h3>
                    <p style="margin-bottom: 20px;">לצפייה בתלוש שנשלח, לחץ על הכפתור:</p>
                    <button onclick="window.open('${result.previewUrl}', '_blank')" style="
                        background: #4CAF50;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-bottom: 15px;
                    ">פתח תצוגה מקדימה</button>
                    <br>
                    <button onclick="this.parentElement.remove(); document.querySelector('.modal-overlay').remove();" style="
                        background: #ccc;
                        border: none;
                        padding: 8px 15px;
                        border-radius: 5px;
                        cursor: pointer;
                    ">סגור</button>
                `;

                overlay.classList.add('modal-overlay');
                modal.classList.add('preview-modal');

                document.body.appendChild(overlay);
                document.body.appendChild(modal);
            } else {
                alert('תלוש השכר נשלח בהצלחה למייל העובד');
            }
        } else {
            const error = await response.text();
            alert('שגיאה בשליחת המייל: ' + error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('שגיאה בשליחת המייל');
    }
}

function downloadPayslip() {
    if (!currentPayslip) {
        alert('נא להפיק תלוש תחילה');
        return;
    }
    window.print();
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayEmployees();
    // Remove the inline generatePayslip function from HTML
    document.querySelector('.generate-slip-button').onclick = generatePayslip;
}); 