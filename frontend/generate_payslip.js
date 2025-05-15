let selectedEmployee = '';

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
            div.onclick = () => selectEmployee(fullName);
            container.appendChild(div);
        });
    } catch (err) {
        console.error('Error fetching employees:', err);
    }
}

function selectEmployee(name) {
    selectedEmployee = name;
    document.querySelector('.payroll-form').style.display = 'block';
    document.querySelector('.payroll-form h3').innerText = `הזנת נתוני שכר עבור ${name}`;
    document.getElementById('payslipContainer').innerHTML = ''; // Clear previous payslip
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function displayPayslip(payslip) {
    const templateUrl = window.location.hostname === 'vmedu421.mtacloud.co.il'
        ? '/templates/payslip_template.html'
        : 'http://localhost:3000/templates/payslip_template.html';
    
    const newWindow = window.open('', '_blank');
    
    fetch(templateUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(template => {
            newWindow.document.open();
            newWindow.document.write(template);
            newWindow.document.close();
            
            const populateData = () => {
                try {
                    newWindow.loadPayslipData(payslip);
                } catch (error) {
                    console.error('Error filling template:', error);
                    newWindow.document.body.innerHTML = `<div class="error">Error filling payslip data: ${error.message}</div>`;
                }
            };

            if (newWindow.document.readyState === 'complete') {
                populateData();
            } else {
                newWindow.onload = populateData;
            }
        })
        .catch(error => {
            console.error('Error loading payslip template:', error);
            newWindow.document.write(`
                <div class="error">
                    <h3>Error Loading Payslip Template</h3>
                    <p>${error.message}</p>
                    <p>Please try refreshing the page or contact support if the problem persists.</p>
                </div>
            `);
            newWindow.document.close();
        });
}

async function generatePayslip() {
    const workHours = document.getElementById("workHours").value;
    const vacationDays = document.getElementById("vacationDays").value;
    const sickDays = document.getElementById("sickDays").value;
    const monthlyBonus = document.getElementById("monthlyBonus").value;
    const workingDays = document.getElementById("workingDays").value;
    const creditPoints = document.getElementById("creditPoints").value;

    if (workHours && vacationDays && sickDays && monthlyBonus && workingDays && creditPoints) {
        try {
            const apiUrl = window.location.hostname === 'vmedu421.mtacloud.co.il'
                ? '/api/payslips'
                : 'http://localhost:3000/api/payslips';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeName: selectedEmployee,
                    workHours,
                    vacationDays,
                    sickDays,
                    monthlyBonus,
                    workingDays,
                    creditPoints
                })
            });

            if (response.ok) {
                const result = await response.json();
                displayPayslip(result);
            } else {
                alert('שגיאה בהפקת התלוש');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('שגיאה בחיבור לשרת');
        }
    } else {
        alert('נא למלא את כל השדות');
    }
}

document.addEventListener('DOMContentLoaded', fetchAndDisplayEmployees); 