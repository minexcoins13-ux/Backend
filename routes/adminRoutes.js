const express = require('express');
const router = express.Router();
const { getAllUsers, deleteUser, getPendingDeposits, approveDeposit, deleteDeposit, updateUserStatus, getPendingKyc, approveKyc, rejectKyc } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/users', protect, admin, getAllUsers);
router.delete('/users/:id', protect, admin, deleteUser);
router.put('/users/:id/status', protect, admin, updateUserStatus);
router.get('/deposits', protect, admin, getPendingDeposits);
router.put('/deposit/:id/approve', protect, admin, approveDeposit);
router.delete('/deposit/:id', protect, admin, deleteDeposit);

router.get('/kyc', protect, admin, getPendingKyc);
router.put('/kyc/:id/approve', protect, admin, approveKyc);
router.put('/kyc/:id/reject', protect, admin, rejectKyc);

module.exports = router;
