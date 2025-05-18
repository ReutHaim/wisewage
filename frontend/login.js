async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const orgcode = document.getElementById('orgcode').value;

    try {
        const apiUrl = window.location.hostname === 'vmedu421.mtacloud.co.il' 
            ? '/api/auth/login'  // Use relative path in production
            : 'http://localhost:3000/api/auth/login';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                companyCode: orgcode
            })
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('fullName', result.name);
            localStorage.setItem('hebrewName', result.hebrewName);
            window.location.href = 'home.html';
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('שגיאת חיבור לשרת');
    }
}
