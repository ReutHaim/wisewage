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

async function generatePayslip() {
    const workHours = document.getElementById("workHours").value;
    const vacationDays = document.getElementById("vacationDays").value;
    const sickDays = document.getElementById("sickDays").value;
    const monthlyBonus = document.getElementById("monthlyBonus").value;

    if (workHours && vacationDays && sickDays && monthlyBonus) {
        try {
            const apiUrl = window.location.hostname === 'vmedu421.mtacloud.co.il'
                ? '/api/payslips'  // Use relative path in production
                : 'http://localhost:3000/api/payslips';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeName: selectedEmployee,
                    workHours,
                    vacationDays,
                    sickDays,
                    monthlyBonus
                })
            });

            if (response.ok) {
                const result = await response.json();
                document.getElementById('payslipContainer').innerHTML = result.payslipHtml;
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

// Initialize the page
document.addEventListener('DOMContentLoaded', fetchAndDisplayEmployees); 