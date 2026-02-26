const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateToken, generateRefreshToken, generateReferralCode } = require('../utils/generateToken');
const { sendWelcomeEmail } = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

        // Helper to generate a realistic mock crypto address
        const generateWalletAddress = (currency) => {
            const crypto = require('crypto');
            const randomHex = crypto.randomBytes(20).toString('hex');
            switch (currency) {
                case 'BTC': return `1${randomHex}`; // Simple mock BTC
                case 'ETH':
                case 'USDT':
                case 'BNB': return `0x${randomHex}`; // Mock EVM
                case 'TRX': return `T${randomHex}`; // Mock Tron
                default: return randomHex;
            }
        };

        // Create wallets for the user
        await prisma.wallet.createMany({
            data: [
                { user_id: user.id, currency: 'USDT', balance: 0.0, address: generateWalletAddress('USDT') },
                { user_id: user.id, currency: 'BTC', balance: 0.0, address: generateWalletAddress('BTC') },
                { user_id: user.id, currency: 'ETH', balance: 0.0, address: generateWalletAddress('ETH') },
                { user_id: user.id, currency: 'TRX', balance: 0.0, address: generateWalletAddress('TRX') },
                { user_id: user.id, currency: 'BNB', balance: 0.0, address: generateWalletAddress('BNB') }
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
            created_at: true,
            kyc: true, // Include KYC data
            bank_name: true,
            account_name: true,
            account_number: true,
            ifsc_code: true
        }
    });

    if (user) {
        res.json({ success: true, data: user });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
};

// @desc    Update bank details
// @route   PUT /api/auth/bank
// @access  Private
const updateBankDetails = async (req, res) => {
    try {
        const { bank_name, account_name, account_number, ifsc_code } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                bank_name,
                account_name,
                account_number,
                ifsc_code
            },
            select: {
                id: true,
                bank_name: true,
                account_name: true,
                account_number: true,
                ifsc_code: true
            }
        });

        res.json({
            success: true,
            message: 'Bank details updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Update Bank Details Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update bank details' });
    }
};

// @desc    Change user password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide both current and new password' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update password' });
    }
};

// @desc    Auth user with Google
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
    try {
        const { credential, referral_code } = req.body;

        if (!credential) {
            return res.status(400).json({ success: false, message: 'Google credential missing' });
        }

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            // Optional: audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();

        if (!payload) {
            return res.status(400).json({ success: false, message: 'Invalid Google token' });
        }

        const { email, name, sub: google_id } = payload;

        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            // User exists: Ensure account is not blocked
            if (user.status === 'BLOCKED') {
                return res.status(403).json({ success: false, message: 'Account is blocked' });
            }

            // Link Google account if not linked
            if (!user.google_id) {
                user = await prisma.user.update({
                    where: { email },
                    data: { google_id }
                });
            }

            // Return login token
            return res.json({
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
        }

        // User does not exist: Register them automatically
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

        user = await prisma.user.create({
            data: {
                name,
                email,
                google_id,
                referral_code: newReferralCode,
                referred_by: referrerId ? referral_code : null
                // password is left null as they signed in via Google
            }
        });

        // Helper to generate a realistic mock crypto address
        const generateWalletAddress = (currency) => {
            const crypto = require('crypto');
            const randomHex = crypto.randomBytes(20).toString('hex');
            switch (currency) {
                case 'BTC': return `1${randomHex}`; // Simple mock BTC
                case 'ETH':
                case 'USDT':
                case 'BNB': return `0x${randomHex}`; // Mock EVM
                case 'TRX': return `T${randomHex}`; // Mock Tron
                default: return randomHex;
            }
        };

        // Create wallets for the user
        await prisma.wallet.createMany({
            data: [
                { user_id: user.id, currency: 'USDT', balance: 0.0, address: generateWalletAddress('USDT') },
                { user_id: user.id, currency: 'BTC', balance: 0.0, address: generateWalletAddress('BTC') },
                { user_id: user.id, currency: 'ETH', balance: 0.0, address: generateWalletAddress('ETH') },
                { user_id: user.id, currency: 'TRX', balance: 0.0, address: generateWalletAddress('TRX') },
                { user_id: user.id, currency: 'BNB', balance: 0.0, address: generateWalletAddress('BNB') }
            ]
        });

        // Send Welcome Email
        sendWelcomeEmail(user.email, user.name).catch(err => {
            console.error('Background welcome email error:', err);
        });

        // Return login response
        return res.status(201).json({
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

    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

module.exports = { registerUser, loginUser, getUserProfile, updateBankDetails, changePassword, googleAuth };
