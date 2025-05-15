function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function fetchWorkerData(id) {
    try {
        // const response = await fetch(`http://${window.location.hostname}:3000/api/workers/${id}`);
        const response = await fetch(`http://localhost:3000/api/workers/${id}`);
        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();

        const setInputValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value || '';
            }
        };

        // Personal Information
        setInputValue("full_name", `${data.firstName || ''} ${data.lastName || ''}`);
        setInputValue("position", data.role);
        setInputValue("start_date", data.startDate?.split('T')[0]);
        setInputValue("email", data.email);
        setInputValue("phone", data.phone);
        setInputValue("id_number", data.personalId);
        setInputValue("address", data.address);
        setInputValue("department", data.department);

        // Salary Information
        setInputValue("base_salary", data.baseSalary);
        setInputValue("travel_allowance", data.travelAllowance);
        setInputValue("meal_allowance", data.mealAllowance);
        setInputValue("phone_allowance", data.phoneAllowance);
        setInputValue("car_allowance", data.carAllowance);
        setInputValue("extra_hours_bonus", data.extraHoursBonus);
        setInputValue("non_competition_bonus", data.nonCompetitionBonus);
        setInputValue("other_allowances", data.otherAllowances);
        
        // Contribution Rates - only use the nested contributionRates object
        const contributions = data.contributionRates || {};
        setInputValue("employee_severance", contributions.employeeSeverance);
        setInputValue("employer_severance", contributions.employerSeverance);
        setInputValue("employee_pension", contributions.employeePension);
        setInputValue("employer_pension", contributions.employerPension);
        setInputValue("employee_education_fund", contributions.employeeEducationFund);
        setInputValue("employer_education_fund", contributions.employerEducationFund);
        
        setInputValue("max_annual_vection_days", data.maxAnnualVectionDays);
        setInputValue("max_annual_sick_days", data.maxAnnualSickDays);
        setInputValue("max_annual_convalescence_days", data.maxAnnualConvalescenceDays);

        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('change', function() {
                this.value = parseFloat(this.value) || 0;
            });
        });

        const form = document.getElementById("contractForm");
        if (form) {
            form.removeEventListener("submit", handleFormSubmit); // Remove any existing listener
            form.addEventListener("submit", handleFormSubmit);
        }

    } catch (err) {
        console.error('Fetch error:', err);
        Swal.fire('שגיאה', 'אירעה שגיאה בעת טעינת נתוני העובד', 'error');
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const fullName = document.getElementById("full_name").value;
    
    try {
        // Create the base worker data object
        const updatedData = {
            firstName: fullName.split(' ')[0] || "",
            lastName: fullName.split(' ')[1] || "",
            role: document.getElementById("position").value,
            startDate: document.getElementById("start_date").value,
            email: document.getElementById("email").value,
            phone: document.getElementById("phone").value,
            personalId: document.getElementById("id_number").value,
            address: document.getElementById("address").value,
            department: document.getElementById("department").value,
            baseSalary: document.getElementById("base_salary").value,
            travelAllowance: document.getElementById("travel_allowance").value,
            mealAllowance: document.getElementById("meal_allowance").value,
            phoneAllowance: document.getElementById("phone_allowance").value,
            carAllowance: document.getElementById("car_allowance").value,
            extraHoursBonus: document.getElementById("extra_hours_bonus").value,
            nonCompetitionBonus: document.getElementById("non_competition_bonus").value,
            otherAllowances: document.getElementById("other_allowances").value,
            maxAnnualVectionDays: document.getElementById("max_annual_vection_days").value,
            maxAnnualSickDays: document.getElementById("max_annual_sick_days").value,
            maxAnnualConvalescenceDays: document.getElementById("max_annual_convalescence_days").value,
            // Only include contribution rates in the nested object
            contributionRates: {
                employeeSeverance: document.getElementById("employee_severance").value,
                employerSeverance: document.getElementById("employer_severance").value,
                employeePension: document.getElementById("employee_pension").value,
                employerPension: document.getElementById("employer_pension").value,
                employeeEducationFund: document.getElementById("employee_education_fund").value,
                employerEducationFund: document.getElementById("employer_education_fund").value
            }
        };

        const response = await fetch(`http://localhost:3000/api/workers/${updatedData.personalId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            throw new Error("Failed to update worker");
        }

        const result = await response.json();
        document.getElementById("formContainer").style.display = "none";
        document.getElementById("successText").textContent = `העובד ${fullName} עודכן בהצלחה במערכת!`;
        document.getElementById("successMessage").style.display = "block";
    } catch (error) {
        console.error("Error updating worker:", error);
        Swal.fire('שגיאה', 'אירעה שגיאה בעת עדכון העובד.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const personalId = getQueryParam("id");
    if (personalId) {
        fetchWorkerData(personalId);
    } else {
        Swal.fire('שגיאה', 'לא נמצא מזהה עובד בכתובת', 'error');
    }
});

function goHome() {
    window.location.href = "home.html";
}