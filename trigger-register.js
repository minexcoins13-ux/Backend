

async function testRegister() {
    const uniqueEmail = `test_${Date.now()}@example.com`;
    console.log('Sending register request for:', uniqueEmail);

    try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Test Setup',
                email: uniqueEmail,
                password: 'Password123'
            })
        });

        console.log('Status code:', response.status);
        const data = await response.text();
        console.log('Response body:', data);
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

testRegister();
