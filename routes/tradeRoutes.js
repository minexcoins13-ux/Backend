const express = require('express');
const router = express.Router();
const { getMarketPrices, executeTrade, getTradeHistory } = require('../controllers/tradeController');
const { protect } = require('../middleware/authMiddleware');

router.get('/prices', getMarketPrices);
router.post('/execute', protect, executeTrade);
router.get('/history', protect, getTradeHistory);

module.exports = router;
