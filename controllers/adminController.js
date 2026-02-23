const prisma = require('../utils/prisma');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                created_at: true,
                wallet: true
            }
        });
        res.json({ success: true, data: users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get pending deposits
// @route   GET /api/admin/deposits
// @access  Private/Admin
const getPendingDeposits = async (req, res) => {
    try {
        const deposits = await prisma.deposit.findMany({
            where: { status: 'PENDING' },
            include: { user: { select: { name: true, email: true } } }
        });
        res.json({ success: true, data: deposits });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Approve deposit
// @route   PUT /api/admin/deposit/:id/approve
// @access  Private/Admin
const approveDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Approving deposit ${id}`);

        const deposit = await prisma.deposit.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!deposit) {
            return res.status(404).json({ success: false, message: 'Deposit not found' });
        }

        if (deposit.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Deposit already processed' });
        }

        await prisma.$transaction(async (tx) => {
            console.log('Starting transaction...');

            // Update Deposit to APPROVED
            await tx.deposit.update({
                where: { id },
                data: { status: 'ACTIVE' }
            });
            console.log('Deposit updated to ACTIVE');

            // Add Balance
            const wallet = await tx.wallet.findUnique({
                where: {
                    user_id_currency: {
                        user_id: deposit.user_id,
                        currency: deposit.currency
                    }
                }
            });

            if (wallet) {
                console.log('Wallet found, updating balance');
                await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { increment: deposit.amount } }
                });
            } else {
                console.log('Wallet not found, creating new');
                await tx.wallet.create({
                    data: {
                        user_id: deposit.user_id,
                        currency: deposit.currency,
                        balance: deposit.amount
                    }
                });
            }

            // Transaction Ledger
            console.log('Creating ledger entry');
            await tx.transactionLedger.create({
                data: {
                    user_id: deposit.user_id,
                    type: 'DEPOSIT',
                    currency: deposit.currency,
                    amount: deposit.amount,
                    reference_id: deposit.id
                }
            });

            // Referral Commission (5%)
            if (deposit.user.referred_by) {
                console.log('Processing referral');
                const referrer = await tx.user.findUnique({
                    where: { referral_code: deposit.user.referred_by }
                });

                if (referrer) {
                    const commission = deposit.amount * 0.05;

                    // Add to referrer wallet
                    const refWallet = await tx.wallet.findUnique({
                        where: {
                            user_id_currency: {
                                user_id: referrer.id,
                                currency: deposit.currency
                            }
                        }
                    });

                    if (refWallet) {
                        await tx.wallet.update({
                            where: { id: refWallet.id },
                            data: { balance: { increment: commission } }
                        });
                    } else {
                        await tx.wallet.create({
                            data: {
                                user_id: referrer.id,
                                currency: deposit.currency,
                                balance: commission
                            }
                        });
                    }

                    // Record Commission
                    await tx.referralCommission.create({
                        data: {
                            referrer_id: referrer.id,
                            user_id: deposit.user_id,
                            amount: commission,
                            currency: deposit.currency,
                            source: 'DEPOSIT'
                        }
                    });

                    // Ledger for Referrer
                    await tx.transactionLedger.create({
                        data: {
                            user_id: referrer.id,
                            type: 'COMMISSION',
                            currency: deposit.currency,
                            amount: commission,
                            reference_id: deposit.id
                        }
                    });
                }
            }
        });

        console.log('Approval transaction successful');
        res.json({ success: true, message: 'Deposit approved' });
    } catch (error) {
        console.error('Approval Error:', error);
        res.status(500).json({ success: false, message: error.message, stack: error.stack });
    }
};

const deleteDeposit = async (req, res) => {
    try {
        const { id } = req.params;

        const deposit = await prisma.deposit.findUnique({
            where: { id }
        });

        if (!deposit) {
            return res.status(404).json({ success: false, message: 'Deposit not found' });
        }

        if (deposit.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Cannot delete processed deposit' });
        }

        await prisma.deposit.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Deposit removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['ACTIVE', 'BLOCKED'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.role === 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Cannot change status of an admin user' });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { status }
        });

        res.json({ success: true, message: `User status changed to ${status}`, data: updatedUser });
    } catch (error) {
        console.error('Update User Status Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = { getAllUsers, getPendingDeposits, approveDeposit, deleteDeposit, updateUserStatus };
