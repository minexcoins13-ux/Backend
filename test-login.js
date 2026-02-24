async function testLogin() {
    console.log('Sending login request...');
    const start = Date.now();
    try {
        const res = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
        });
        const text = await res.text();
        console.log(`Response in ${Date.now() - start}ms:`, res.status, text);
    } catch (err) {
        console.error(`Error in ${Date.now() - start}ms:`, err);
    }
}

testLogin();
