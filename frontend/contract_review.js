function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function loadContractData() {
    try {
        const id = getQueryParam("id");
        const contractPath = getQueryParam("contractPath");
        const parsedData = JSON.parse(decodeURIComponent(getQueryParam("parsedData")));
        const currentData = JSON.parse(decodeURIComponent(getQueryParam("currentData")));

        if (!id || !contractPath || !parsedData || !currentData) {
            throw new Error("Missing required data");
        }

        // Set read-only fields from current data
        document.getElementById("full_name").value = `${currentData.firstName || ''} ${currentData.lastName || ''}`;
        document.getElementById("start_date").value = currentData.startDate?.split('T')[0] || '';
        document.getElementById("id_number").value = currentData.personalId || '';

        // Set other fields from parsed data
        document.getElementById("position").value = parsedData.role || '';
        document.getElementById("email").value = parsedData.email || '';
        document.getElementById("phone").value = parsedData.phone || '';
        document.getElementById("address").value = parsedData.address || '';
        document.getElementById("department").value = parsedData.department || '';
        document.getElementById("base_salary").value = parsedData.baseSalary || '';
        document.getElementById("travel_allowance").value = parsedData.travelAllowance || '';
        document.getElementById("meal_allowance").value = parsedData.mealAllowance || '';
        document.getElementById("phone_allowance").value = parsedData.phoneAllowance || '';
        document.getElementById("car_allowance").value = parsedData.carAllowance || '';
        document.getElementById("extra_hours_bonus").value = parsedData.extraHoursBonus || '';
        document.getElementById("non_competition_bonus").value = parsedData.nonCompetitionBonus || '';
        document.getElementById("other_allowances").value = parsedData.otherAllowances || '';
        
        // Set contribution rates
        const contributions = parsedData.contributionRates || {};
        document.getElementById("employee_severance").value = contributions.employeeSeverance || '';
        document.getElementById("employer_severance").value = contributions.employerSeverance || '';
        document.getElementById("employee_pension").value = contributions.employeePension || '';
        document.getElementById("employer_pension").value = contributions.employerPension || '';
        document.getElementById("employee_education_fund").value = contributions.employeeEducationFund || '';
        document.getElementById("employer_education_fund").value = contributions.employerEducationFund || '';
        
        // Set annual days
        document.getElementById("max_annual_vection_days").value = parsedData.maxAnnualVectionDays || '';
        document.getElementById("max_annual_sick_days").value = parsedData.maxAnnualSickDays || '';
        document.getElementById("max_annual_convalescence_days").value = parsedData.maxAnnualConvalescenceDays || '';

        // Add number input validation
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('change', function() {
                this.value = parseFloat(this.value) || 0;
            });
        });

    } catch (err) {
        console.error('Error loading contract data:', err);
        Swal.fire('שגיאה', 'אירעה שגיאה בטעינת נתוני החוזה', 'error');
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const id = getQueryParam("id");
    const contractPath = getQueryParam("contractPath");
    
    if (!id || !contractPath) {
        Swal.fire('שגיאה', 'חסרים נתונים נדרשים', 'error');
        return;
    }

    try {
        const formData = {
            contractPath: contractPath,
            parsedData: {
                role: document.getElementById("position").value,
                email: document.getElementById("email").value,
                phone: document.getElementById("phone").value,
                address: document.getElementById("address").value,
                department: document.getElementById("department").value,
                baseSalary: parseFloat(document.getElementById("base_salary").value) || 0,
                travelAllowance: parseFloat(document.getElementById("travel_allowance").value) || 0,
                mealAllowance: parseFloat(document.getElementById("meal_allowance").value) || 0,
                phoneAllowance: parseFloat(document.getElementById("phone_allowance").value) || 0,
                carAllowance: parseFloat(document.getElementById("car_allowance").value) || 0,
                extraHoursBonus: parseFloat(document.getElementById("extra_hours_bonus").value) || 0,
                nonCompetitionBonus: parseFloat(document.getElementById("non_competition_bonus").value) || 0,
                otherAllowances: parseFloat(document.getElementById("other_allowances").value) || 0,
                contributionRates: {
                    employeeSeverance: parseFloat(document.getElementById("employee_severance").value) || 0,
                    employerSeverance: parseFloat(document.getElementById("employer_severance").value) || 0,
                    employeePension: parseFloat(document.getElementById("employee_pension").value) || 0,
                    employerPension: parseFloat(document.getElementById("employer_pension").value) || 0,
                    employeeEducationFund: parseFloat(document.getElementById("employee_education_fund").value) || 0,
                    employerEducationFund: parseFloat(document.getElementById("employer_education_fund").value) || 0
                },
                maxAnnualVectionDays: parseInt(document.getElementById("max_annual_vection_days").value) || 0,
                maxAnnualSickDays: parseInt(document.getElementById("max_annual_sick_days").value) || 0,
                maxAnnualConvalescenceDays: parseInt(document.getElementById("max_annual_convalescence_days").value) || 0
            }
        };

        const response = await fetch(`${window.appConfig.apiBaseUrl}/api/workers/${id}/save-contract-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to save contract data');
        }

        const result = await response.json();
        document.getElementById("formContainer").style.display = "none";
        document.getElementById("successText").textContent = "החוזה עודכן בהצלחה!";
        document.getElementById("successMessage").style.display = "block";

    } catch (error) {
        console.error('Error saving contract data:', error);
        Swal.fire('שגיאה', 'אירעה שגיאה בשמירת החוזה', 'error');
    }
}

function goHome() {
    window.location.href = "employee_management.html";
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadContractData();
    document.getElementById("contractForm").addEventListener("submit", handleFormSubmit);
}); 