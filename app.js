const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const prisma = require('./utils/prisma');

// Load env vars
dotenv.config();

// Create Express app
const app = express();

// Serve static directory for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
app.use(helmet()); // Security headers
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // Logger

// CORS setup
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://10.183.55.212:3000',
            process.env.FRONTEND_URL
        ];
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            // Optional: Allow all during dev if needed, or specific IP range
            // For now, strict check
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
    },
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/trade', require('./routes/tradeRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/kyc', require('./routes/kycRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

app.get('/', async (req, res) => {
    try {
        // Ping the database to keep Neon active
        await prisma.$queryRaw`SELECT 1`;
        res.json({ message: 'Welcome to MINEXCOINS API', status: 'Running', database: 'Connected' });
    } catch (error) {
        console.error('Database ping failed:', error);
        res.status(500).json({ message: 'Welcome to MINEXCOINS API', status: 'Running', database: 'Disconnected' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

module.exports = app;
