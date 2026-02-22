const prisma = require('../utils/prisma');

// @desc    Get user wallet balance
// @route   GET /api/wallet
// @access  Private
const getWallet = async (req, res) => {
    try {
        const wallets = await prisma.wallet.findMany({
            where: { user_id: req.user.id }
        });
        res.json({ success: true, data: wallets });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Request a deposit
// @route   POST /api/wallet/deposit
// @access  Private
const depositRequest = async (req, res) => {
    try {
        const { amount, currency, txid } = req.body;

        if (!amount || !currency || !txid) {
            return res.status(400).json({ success: false, message: 'Please fill all fields' });
        }

        const txExists = await prisma.deposit.findUnique({
            where: { txid }
        });

        if (txExists) {
            return res.status(400).json({ success: false, message: 'Transaction ID already submitted' });
        }

        const deposit = await prisma.deposit.create({
            data: {
                user_id: req.user.id,
                amount: parseFloat(amount),
                currency,
                txid
            }
        });

        res.status(201).json({ success: true, data: deposit });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Request a withdrawal
// @route   POST /api/wallet/withdraw
// @access  Private
const withdrawRequest = async (req, res) => {
    try {
        const { amount, currency, address } = req.body;

        if (!amount || !currency || !address) {
            return res.status(400).json({ success: false, message: 'Please fill all fields' });
        }

        const wallet = await prisma.wallet.findUnique({
            where: {
                user_id_currency: {
                    user_id: req.user.id,
                    currency
                }
            }
        });

        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }

        // Deduct balance immediately (lock funds)
        await prisma.wallet.update({
            where: {
                user_id_currency: {
                    user_id: req.user.id,
                    currency
                }
            },
            data: {
                balance: { decrement: parseFloat(amount) }
            }
        });

        const withdrawal = await prisma.withdrawal.create({
            data: {
                user_id: req.user.id,
                amount: parseFloat(amount),
                currency,
                address,
                status: 'PENDING'
            }
        });

        res.status(201).json({ success: true, data: withdrawal });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get transaction history
// @route   GET /api/wallet/transactions
// @access  Private
const getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch completed transactions from ledger
        const ledger = await prisma.transactionLedger.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' }
        });

        // Fetch pending deposits
        const pendingDeposits = await prisma.deposit.findMany({
            where: {
                user_id: userId,
                status: 'PENDING'
            },
            orderBy: { created_at: 'desc' }
        });

        // Fetch pending withdrawals
        const pendingWithdrawals = await prisma.withdrawal.findMany({
            where: {
                user_id: userId,
                status: 'PENDING'
            },
            orderBy: { created_at: 'desc' }
        });

        // Format pending items to match ledger structure
        const formattedDeposits = pendingDeposits.map(d => ({
            id: d.id,
            user_id: d.user_id,
            type: 'DEPOSIT (PENDING)',
            currency: d.currency,
            amount: d.amount,
            reference_id: d.txid,
            created_at: d.created_at,
            status: 'PENDING'
        }));

        const formattedWithdrawals = pendingWithdrawals.map(w => ({
            id: w.id,
            user_id: w.user_id,
            type: 'WITHDRAWAL (PENDING)',
            currency: w.currency,
            amount: -w.amount, // Negative for withdrawal
            reference_id: w.address,
            created_at: w.created_at,
            status: 'PENDING'
        }));

        // Combine all and sort by date desc
        const allTransactions = [...formattedDeposits, ...formattedWithdrawals, ...ledger].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        res.json({ success: true, data: allTransactions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = { getWallet, depositRequest, withdrawRequest, getTransactions };
