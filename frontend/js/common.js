// טעינת נתוני משתמש
function loadUserData() {
    const hebrewName = localStorage.getItem('hebrewName') || 'משתמש';
    document.getElementById('welcome').innerText = `שלום ${hebrewName}`;
    
    // הצגת האות הראשונה של השם באווטר אם אין תמונה
    const userAvatar = document.getElementById('userAvatar');
    userAvatar.textContent = hebrewName.charAt(0);
}

// פונקציה לפתיחה/סגירה של התפריט
function toggleMenu() {
    const dropdown = document.getElementById('dropdownMenu');
    isMenuOpen = !isMenuOpen;
    
    if (isMenuOpen) {
        dropdown.classList.add('open');
    } else {
        dropdown.classList.remove('open');
    }
}

// פונקציית התנתקות
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// Initialize menu state
let isMenuOpen = false;

// סגירת התפריט בלחיצה מחוץ לו
document.addEventListener('click', function(event) {
    const menuButton = document.querySelector('.menu-button');
    const dropdown = document.getElementById('dropdownMenu');
    
    if (!menuButton.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.remove('open');
        isMenuOpen = false;
    }
}); 