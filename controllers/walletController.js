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

// @desc    Request a withdrawal (or execute an internal transfer)
// @route   POST /api/wallet/withdraw
// @access  Private
const withdrawRequest = async (req, res) => {
    try {
        const { amount, currency, address } = req.body;

        if (!amount || !currency || !address) {
            return res.status(400).json({ success: false, message: 'Please fill all fields' });
        }

        const senderWallet = await prisma.wallet.findUnique({
            where: {
                user_id_currency: {
                    user_id: req.user.id,
                    currency
                }
            }
        });

        if (!senderWallet || senderWallet.balance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }

        // Prevent sending to self
        if (senderWallet.address === address) {
            return res.status(400).json({ success: false, message: 'Cannot send to your own address' });
        }

        // Check if destination address is an internal wallet
        const receiverWallet = await prisma.wallet.findUnique({
            where: { address }
        });

        if (receiverWallet) {
            // It's an internal transfer! Executing instantly within a transaction.
            if (receiverWallet.currency !== currency) {
                return res.status(400).json({ success: false, message: 'Destination address is for a different currency type' });
            }

            await prisma.$transaction(async (tx) => {
                // Deduct from Sender
                await tx.wallet.update({
                    where: { id: senderWallet.id },
                    data: { balance: { decrement: parseFloat(amount) } }
                });

                // Record Sender Ledger
                await tx.transactionLedger.create({
                    data: {
                        user_id: req.user.id,
                        type: 'WITHDRAWAL', // Using WITHDRAWAL to represent outgoing send
                        currency,
                        amount: -parseFloat(amount),
                        reference_id: `Internal send to ${address}`
                    }
                });

                // Add to Receiver
                await tx.wallet.update({
                    where: { id: receiverWallet.id },
                    data: { balance: { increment: parseFloat(amount) } }
                });

                // Record Receiver Ledger
                await tx.transactionLedger.create({
                    data: {
                        user_id: receiverWallet.user_id,
                        type: 'DEPOSIT', // Using DEPOSIT to represent incoming receive
                        currency,
                        amount: parseFloat(amount),
                        reference_id: `Internal receive from ${senderWallet.address}`
                    }
                });
            });

            return res.status(200).json({ success: true, message: 'Internal transfer successful' });
        }

        // Otherwise, it's an external transfer (Withdrawal Request)
        // Deduct balance immediately (lock funds)
        await prisma.wallet.update({
            where: {
                id: senderWallet.id
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

        // Optional: Also log to ledger here as PENDING if preferred, but existing getTransactions logic handles this.
        res.status(201).json({ success: true, message: 'Withdrawal request submitted successfully', data: withdrawal });
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
