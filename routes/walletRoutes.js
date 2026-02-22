const express = require('express');
const router = express.Router();
const { getWallet, depositRequest, withdrawRequest, getTransactions } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getWallet);
router.post('/deposit', protect, depositRequest);
router.post('/withdraw', protect, withdrawRequest);
router.get('/transactions', protect, getTransactions);

module.exports = router;
