const express = require('express');
const router = express.Router();
const { getAllUsers, getPendingDeposits, approveDeposit, deleteDeposit } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/users', protect, admin, getAllUsers);
router.get('/deposits', protect, admin, getPendingDeposits);
router.put('/deposit/:id/approve', protect, admin, approveDeposit);
router.delete('/deposit/:id', protect, admin, deleteDeposit);

module.exports = router;
