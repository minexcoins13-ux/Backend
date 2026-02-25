const { sendContactEmail } = require('../utils/sendEmail');

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
const submitContactForm = async (req, res) => {
    try {
        const { firstName, lastName, email, subject, message } = req.body;

        if (!firstName || !lastName || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: 'Please fill all fields' });
        }

        // Send email asynchronously to prevent long request times blocking the frontend
        sendContactEmail({ firstName, lastName, email, subject, message }).catch(err => {
            console.error('Failed to send contact email in background:', err);
        });

        // Immediately respond to the client
        res.status(200).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact Form Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

module.exports = { submitContactForm };
