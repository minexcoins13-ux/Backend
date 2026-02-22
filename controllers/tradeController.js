const prisma = require('../utils/prisma');
const { getPrices } = require('../utils/priceService');

// @desc    Get live prices
// @route   GET /api/trade/prices
// @access  Public
const getMarketPrices = async (req, res) => {
    try {
        const prices = await getPrices();
        res.json({ success: true, data: prices });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Execute a trade
// @route   POST /api/trade/execute
// @access  Private
const executeTrade = async (req, res) => {
    // Transaction to ensure atomicity
    try {
        const { pair, type, amount } = req.body; // type: BUY or SELL, amount in source currency?
        // Let's assume amount is in the asset being bought/sold/spent?
        // Standard:
        // BUY BTC/USDT -> Spend USDT, Get BTC. Amount is usually in USDT (total) or BTC (quantity).
        // Let's keep it simple: "amount" is the quantity of the base asset (BTC in BTC/USDT).

        if (!pair || !type || !amount) {
            return res.status(400).json({ success: false, message: 'Please fill all fields' });
        }

        const [base, quote] = pair.split('/'); // e.g., BTC/USDT
        const prices = await getPrices();
        const price = prices[base]; // Current price of BTC

        if (!price) {
            return res.status(400).json({ success: false, message: 'Invalid pair' });
        }

        const feePercent = 0.002; // 0.2%
        let totalCost, fee, receiveAmount;

        // Fetch User Wallets
        const userWallets = await prisma.wallet.findMany({
            where: { user_id: req.user.id }
        });

        const baseWallet = userWallets.find(w => w.currency === base);
        const quoteWallet = userWallets.find(w => w.currency === quote);

        if (!baseWallet || !quoteWallet) {
            // Create if missing (should be created on register, but just in case)
            return res.status(400).json({ success: false, message: 'Wallets not found' });
        }

        await prisma.$transaction(async (prisma) => {
            if (type === 'BUY') {
                // Buying BTC with USDT
                // Amount = BTC quantity
                // Cost = Amount * Price
                totalCost = amount * price;
                fee = totalCost * feePercent;
                const totalSpend = totalCost + fee;

                if (quoteWallet.balance < totalSpend) {
                    throw new Error('Insufficient USDT balance');
                }

                // Deduct USDT
                await prisma.wallet.update({
                    where: { id: quoteWallet.id },
                    data: { balance: { decrement: totalSpend } }
                });

                // Add BTC
                await prisma.wallet.update({
                    where: { id: baseWallet.id },
                    data: { balance: { increment: parseFloat(amount) } }
                });

                // Record Transaction (USDT Spent)
                await prisma.transactionLedger.create({
                    data: {
                        user_id: req.user.id,
                        type: 'TRADE_BUY',
                        currency: quote,
                        amount: -totalSpend, // Negative for spend
                        reference_id: 'TRADE' // Placeholder, will update or link logic later
                    }
                });

            } else if (type === 'SELL') {
                // Selling BTC for USDT
                // Amount = BTC quantity
                if (baseWallet.balance < amount) {
                    throw new Error('Insufficient BTC balance');
                }

                const totalValue = amount * price;
                fee = totalValue * feePercent;
                const receiveTotal = totalValue - fee;

                // Deduct BTC
                await prisma.wallet.update({
                    where: { id: baseWallet.id },
                    data: { balance: { decrement: parseFloat(amount) } }
                });

                // Add USDT
                await prisma.wallet.update({
                    where: { id: quoteWallet.id },
                    data: { balance: { increment: receiveTotal } }
                });

                // Record Transaction (BTC Sold)
                await prisma.transactionLedger.create({
                    data: {
                        user_id: req.user.id,
                        type: 'TRADE_SELL',
                        currency: base,
                        amount: -parseFloat(amount),
                        reference_id: 'TRADE'
                    }
                });
            } else {
                throw new Error('Invalid trade type');
            }

            // Create Trade Record
            const trade = await prisma.trade.create({
                data: {
                    user_id: req.user.id,
                    pair,
                    type,
                    price,
                    amount: parseFloat(amount),
                    fee,
                    total: type === 'BUY' ? (amount * price) : (amount * price), // Value traded
                }
            });

            return trade;
        });

        res.status(201).json({ success: true, message: 'Trade executing' });

    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message || 'Trade failed' });
    }
};

// @desc    Get trade history
// @route   GET /api/trade/history
// @access  Private
const getTradeHistory = async (req, res) => {
    try {
        const trades = await prisma.trade.findMany({
            where: { user_id: req.user.id },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: trades });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = { getMarketPrices, executeTrade, getTradeHistory };
