const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, updateBankDetails, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/bank', protect, updateBankDetails);
router.put('/password', protect, changePassword);

module.exports = router;
