const fileInput = document.getElementById("contractFile");
const progressBar = document.getElementById("progressBar");
const progressContainer = document.getElementById("progressContainer");
const successIcon = document.getElementById("successIcon");
const nextMessage = document.getElementById("nextMessage");
const nextBtn = document.getElementById("nextBtn");

let uploadedWorkerId = null;

fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
        uploadFile(fileInput.files[0]);
    }
});

function uploadFile(file) {
    const formData = new FormData();
    formData.append('contract', file);

    progressContainer.style.display = "block";
    progressBar.style.width = "0%";
    successIcon.style.display = "none";
    nextMessage.style.display = "none";
    nextBtn.style.display = "none";

    const xhr = new XMLHttpRequest();
    const apiUrl = window.location.hostname === 'vmedu421.mtacloud.co.il'
        ? '/api/contracts/upload-pdf'  // Use relative path in production
        : 'http://localhost:3000/api/contracts/upload-pdf';
    
    xhr.open("POST", apiUrl, true);

    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = (event.loaded / event.total) * 100;
            progressBar.style.width = percent + "%";
        }
    };

    xhr.onerror = function() {
        alert('אירעה שגיאה בהעלאת הקובץ');
    };

    xhr.onload = function() {
        try {
            const response = JSON.parse(xhr.responseText);
            
            if (xhr.status === 201) {
                uploadedWorkerId = response.workerId;
                successIcon.style.display = "block";
                nextMessage.style.display = "block";
                nextBtn.style.display = "inline-block";
            } else {
                // Handle different error cases
                if (xhr.status === 409 && response.workerId) {
                    // Worker already exists case
                    if (confirm(response.message + '\nהאם ברצונך לערוך את פרטי העובד הקיים?')) {
                        window.location.href = `review.html?id=${response.workerId}`;
                    }
                } else {
                    // Other error cases
                    alert(response.message || 'אירעה שגיאה בהעלאת החוזה');
                }
            }
        } catch (error) {
            alert('אירעה שגיאה בעיבוד התגובה מהשרת');
        }
    };

    xhr.send(formData);
}

function goNext() {
    if (uploadedWorkerId) {
        window.location.href = `review.html?id=${uploadedWorkerId}`;
    } else {
        alert("לא נמצא מזהה עובד. ודא שהקובץ הועלה בהצלחה.");
    }
}

