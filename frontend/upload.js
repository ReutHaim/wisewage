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
    xhr.open("POST", `http://${window.location.hostname}:3000/api/contracts/upload-pdf`, true);

    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = (event.loaded / event.total) * 100;
            progressBar.style.width = percent + "%";
        }
    };

    xhr.onload = function () {
        if (xhr.status === 201) {
            const response = JSON.parse(xhr.responseText);
            uploadedWorkerId = response.workerId;
            successIcon.style.display = "block";
            nextMessage.style.display = "block";
            nextBtn.style.display = "inline-block";
        } else {
            alert("שגיאה בהעלאת החוזה: " + xhr.responseText);
        }
    };

    xhr.onerror = function () {
        alert("אירעה שגיאה בעת שליחת הקובץ לשרת");
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
