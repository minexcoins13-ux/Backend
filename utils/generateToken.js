const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '15m' // Access token short lived
    });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: '7d'
    });
};

const generateReferralCode = (name) => {
    const random = Math.floor(Math.random() * 10000);
    const code = name.substring(0, 3).toUpperCase() + random;
    return code;
};

module.exports = { generateToken, generateRefreshToken, generateReferralCode };
