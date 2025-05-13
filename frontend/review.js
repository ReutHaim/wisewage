function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function fetchWorkerData(id) {
    try {
        const response = await fetch(`http://${window.location.hostname}:3000/api/workers/${id}`);
        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();

        document.getElementById("full_name").value = data.firstName + ' ' + data.lastName;
        document.getElementById("position").value = data.role;
        document.getElementById("start_date").value = data.startDate?.split('T')[0];
        document.getElementById("email").value = data.email;
        document.getElementById("phone").value = data.phone;
        document.getElementById("id_number").value = data.personalId;
        document.getElementById("marital_status").value = data.maritalStatus || '';

        document.getElementById("base_salary").value = data.baseSalary || 0;
        document.getElementById("travel_allowance").value = data.travelAllowance || 0;
        document.getElementById("meal_allowance").value = data.mealAllowance || 0;
        document.getElementById("phone_allowance").value = data.phoneAllowance || 0;
        document.getElementById("car_allowance").value = data.carAllowance || 0;
        document.getElementById("extra_hours_bonus").value = data.extraHoursBonus || 0;
        document.getElementById("non_competition_bonus").value = data.nonCompetitionBonus || 0;
        document.getElementById("other_allowances").value = data.otherAllowances || 0;
        
        const contributions = data.contributionRates || {};
        document.getElementById("employee_severance").value = contributions.employeeSeverance || 0;
        document.getElementById("employer_severance").value = contributions.employerSeverance || 0;
        document.getElementById("employee_pension").value = contributions.employeePension || 0;
        document.getElementById("employer_pension").value = contributions.employerPension || 0;
        document.getElementById("employee_education_fund").value = contributions.employeeEducationFund || 0;
        document.getElementById("employer_education_fund").value = contributions.employerEducationFund || 0;
        
        document.getElementById("max_annual_vection_days").value = data.maxAnnualVectionDays || 0;
        document.getElementById("max_annual_sick_days").value = data.maxAnnualSickDays || 0;
        document.getElementById("max_annual_convalescence_days").value = data.maxAnnualConvalescenceDays || 0;

        document.getElementById("other_details").value = data.otherDetails || '';

        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('change', function() {
                this.value = parseFloat(this.value) || 0;
            });
        });

    } catch (err) {
        Swal.fire('שגיאה', 'אירעה שגיאה בעת טעינת נתוני העובד', 'error');
        console.error('Fetch error:', err);
    }
}

window.onload = () => {
    const personalId = getQueryParam("id");
    if (personalId) {
        fetchWorkerData(personalId);
    } else {
        Swal.fire('שגיאה', 'לא נמצא מזהה עובד בכתובת', 'error');
    }
};

document.getElementById("contractForm").addEventListener("submit", function(event) {
    event.preventDefault();
    const fullName = document.getElementById("full_name").value;
    
    Swal.fire({
        title: 'אישור נתונים',
        text: 'האם אתה בטוח שברצונך לאשר ולשמור את העובד?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'אישור',
        cancelButtonText: 'ביטול',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            const updatedData = {
                firstName: fullName.split(' ')[0] || "",
                lastName: fullName.split(' ')[1] || "",
                role: document.getElementById("position").value,
                startDate: document.getElementById("start_date").value,
                email: document.getElementById("email").value,
                phone: document.getElementById("phone").value,
                personalId: document.getElementById("id_number").value,
                maritalStatus: document.getElementById("marital_status").value,
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
                maxAnnualVectionDays: parseFloat(document.getElementById("max_annual_vection_days").value) || 0,
                maxAnnualSickDays: parseFloat(document.getElementById("max_annual_sick_days").value) || 0,
                maxAnnualConvalescenceDays: parseFloat(document.getElementById("max_annual_convalescence_days").value) || 0
            };

            fetch(`http://${window.location.hostname}:3000/api/workers/${updatedData.personalId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to update worker");
                }
                return response.json();
            })
            .then(data => {
                document.getElementById("formContainer").style.display = "none";
                document.getElementById("successText").textContent = `העובד ${fullName} עודכן בהצלחה במערכת!`;
                document.getElementById("successMessage").style.display = "block";
            })
            .catch(error => {
                console.error("Error updating worker:", error);
                Swal.fire('שגיאה', 'אירעה שגיאה בעת עדכון העובד.', 'error');
            });
        }
    });
});

function goHome() {
    window.location.href = "home.html";
}