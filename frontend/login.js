async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const orgcode = document.getElementById('orgcode').value;

    try {
        // const response = await fetch(`http://${window.location.hostname}:3000/api/auth/login`, {
        const response = await fetch(`http://localhost:3000/api/auth/login`, {
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
            alert(result.message); // Optional
            window.location.href = 'home.html';
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('שגיאת חיבור לשרת');
    }
}
