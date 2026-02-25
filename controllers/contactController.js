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

        const emailSent = await sendContactEmail({ firstName, lastName, email, subject, message });

        if (emailSent) {
            res.status(200).json({ success: true, message: 'Message sent successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to send message' });
        }
    } catch (error) {
        console.error('Contact Form Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

module.exports = { submitContactForm };
