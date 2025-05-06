function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function fetchWorkerData(id) {
    try {
        const response = await fetch(`http://localhost:3000/api/workers/${id}`);
        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();

        document.getElementById("full_name").value = data.firstName + ' ' + data.lastName;
        document.getElementById("position").value = data.role;
        document.getElementById("start_date").value = data.startDate?.split('T')[0];
        document.getElementById("email").value = data.email;
        document.getElementById("phone").value = data.phone;
        document.getElementById("id_number").value = data.personalId;
        document.getElementById("marital_status").value = data.maritalStatus || '';
        document.getElementById("salary_conditions").value = data.salaryDetails;
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
            document.getElementById("formContainer").style.display = "none";
            document.getElementById("successText").textContent = `העובד ${fullName} נקלט בהצלחה במערכת!`;
            document.getElementById("successMessage").style.display = "block";
        }
    });
});

function goHome() {
    window.location.href = "home.html";
}