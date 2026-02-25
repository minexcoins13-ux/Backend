const nodemailer = require('nodemailer');

console.log('--- sendEmail.js loaded ---');

const sendWelcomeEmail = async (email, name) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 465,
            secure: process.env.EMAIL_SECURE !== 'false', // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Welcome to MinexCoins!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">Welcome to MinexCoins, ${name}!</h2>
                    <p>We are thrilled to have you on board. Start exploring the platform and trading securely.</p>
                    <p>If you have any questions, feel free to reach out to our support team.</p>
                    <br>
                    <p>Best regards,</p>
                    <p><strong>The MinexCoins Team</strong></p>
                </div>
            `
        };

        console.log('Attempting to send mail to:', email);
        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email successfully sent to', email);
        console.log('Response:', info.response);
        return true;
    } catch (error) {
        console.error('CRITICAL Error sending welcome email in sendEmail.js:');
        console.error(error);
        return false;
    }
};

const sendContactEmail = async ({ firstName, lastName, email, subject, message }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 465,
            secure: process.env.EMAIL_SECURE !== 'false',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'support@minexcoins.com',
            replyTo: email,
            subject: `Contact Form: ${subject} - from ${firstName} ${lastName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">New Contact Form Submission</h2>
                    <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <hr />
                    <p><strong>Message:</strong></p>
                    <p style="white-space: pre-wrap;">${message}</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Contact email successfully sent to support@minexcoins.com');
        console.log('Response:', info.response);
        return true;
    } catch (error) {
        console.error('CRITICAL Error sending contact email in sendEmail.js:');
        console.error(error);
        return false;
    }
};

module.exports = { sendWelcomeEmail, sendContactEmail };
