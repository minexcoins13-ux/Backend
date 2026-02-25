const express = require('express');
const router = express.Router();
const { uploadKycDocument } = require('../controllers/kycController');
const { protect } = require('../middleware/authMiddleware');

router.post('/upload', protect, uploadKycDocument);

module.exports = router;
