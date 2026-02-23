const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateToken, generateRefreshToken, generateReferralCode } = require('../utils/generateToken');
const { sendWelcomeEmail } = require('../utils/sendEmail');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        console.log('Register request body:', req.body);
        const { name, email, password, referral_code } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please fill all fields' });
        }

        const userExists = await prisma.user.findUnique({
            where: { email }
        });

        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newReferralCode = generateReferralCode(name);

        let referrerId = null;
        if (referral_code) {
            const referrer = await prisma.user.findUnique({
                where: { referral_code }
            });
            if (referrer) {
                referrerId = referrer.id;
            }
        }

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                referral_code: newReferralCode,
                referred_by: referrerId ? referral_code : null
            }
        });

        // Create wallets for the user
        await prisma.wallet.createMany({
            data: [
                { user_id: user.id, currency: 'USDT', balance: 0.0 },
                { user_id: user.id, currency: 'BTC', balance: 0.0 },
                { user_id: user.id, currency: 'ETH', balance: 0.0 }
            ]
        });

        // Send Welcome Email in the background so it doesn't delay/block registration response
        sendWelcomeEmail(user.email, user.name).catch(err => {
            console.error('Background welcome email error:', err);
        });

        res.status(201).json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                referral_code: user.referral_code,
                token: generateToken(user.id),
                refreshToken: generateRefreshToken(user.id)
            }
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    console.log('[loginUser] Request received for email:', req.body?.email);
    try {
        const { email, password } = req.body;

        console.log('[loginUser] Calling prisma.user.findUnique...');
        const user = await prisma.user.findUnique({
            where: { email }
        });
        console.log('[loginUser] Prisma returned user:', user ? user.id : null);

        if (user && (await bcrypt.compare(password, user.password))) {
            console.log('[loginUser] Password matched for user:', user.id);
            if (user.status === 'BLOCKED') {
                return res.status(403).json({ success: false, message: 'Account is blocked' });
            }

            res.json({
                success: true,
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user.id),
                    refreshToken: generateRefreshToken(user.id)
                }
            });
        } else {
            console.log('[loginUser] Invalid credentials');
            res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error("[loginUser] Login Error Object:", error);
        res.status(500).json({ success: false, message: 'Server Error Full: ' + JSON.stringify(error, Object.getOwnPropertyNames(error)) });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            referral_code: true,
            referred_by: true,
            created_at: true
        }
    });

    if (user) {
        res.json({ success: true, data: user });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
};

module.exports = { registerUser, loginUser, getUserProfile };
