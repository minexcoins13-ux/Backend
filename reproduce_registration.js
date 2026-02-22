const axios = require('axios');

const register = async () => {
    try {
        const res = await axios.post('http://localhost:5000/api/auth/register', {
            name: 'Test User',
            email: 'testuser_' + Date.now() + '@example.com',
            password: 'password123'
        });
        console.log('Registration successful:', res.data);
    } catch (error) {
        if (error.response) {
            console.error('Registration failed with status:', error.response.status);
            console.error('Data:', error.response.data);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error setting up request:', error.message);
        }
    }
};

register();
