require('dotenv').config();
const { sendWelcomeEmail } = require('./utils/sendEmail');

async function testEmail() {
    console.log("Testing email with process.env.EMAIL_USER:", process.env.EMAIL_USER);
    const result = await sendWelcomeEmail('test@example.com', 'Test User');
    if (result) {
        console.log("Email reported as sent successfully! Check the receiver's inbox if the credentials are valid.");
    } else {
        console.log("Email failed to send. Please verify the SMTP credentials in your .env file.");
    }
}

testEmail();
