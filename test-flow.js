const axios = require('axios');

const testFlow = async () => {
    const email = 'testuser_' + Date.now() + '@example.com';
    const password = 'password123';

    try {
        console.log('Registering user...');
        const regRes = await axios.post('http://localhost:5000/api/auth/register', {
            name: 'Test User',
            email: email,
            password: password
        });
        console.log('Registration successful:', regRes.data.success);

        console.log('Logging in user...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: email,
            password: password
        });
        console.log('Login successful:', loginRes.data);
    } catch (error) {
        if (error.response) {
            console.error('Request failed with status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

testFlow();
