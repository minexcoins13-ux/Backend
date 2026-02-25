const axios = require('axios');
axios.post('http://localhost:5000/api/contact', {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    subject: 'General Inquiry',
    message: 'This is a test message'
}).then(res => {
    console.log("SUCCESS:", res.data);
}).catch(err => {
    console.error("ERROR:");
    console.error(err.response ? err.response.data : err.message);
});
