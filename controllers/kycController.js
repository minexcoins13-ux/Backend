const prisma = require('../utils/prisma');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for images/pdfs
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images (jpeg, jpg, png) and PDFs are allowed'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
}).single('document'); // Field name expects 'document'


// @desc    Upload KYC document
// @route   POST /api/kyc/upload
// @access  Private
const uploadKycDocument = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a document' });
        }

        try {
            const { document_type } = req.body; // e.g., 'PASSPORT', 'ID_CARD'

            if (!document_type) {
                // remove the uploaded file if validation fails
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ success: false, message: 'Please provide a document_type' });
            }

            const documentUrl = `/uploads/${req.file.filename}`;
            const userId = req.user.id;

            // Upsert KYC record
            const kyc = await prisma.kYC.upsert({
                where: { user_id: userId },
                update: {
                    document_url: documentUrl,
                    document_type: document_type,
                    status: 'PENDING',
                    submitted_at: new Date()
                },
                create: {
                    user_id: userId,
                    document_url: documentUrl,
                    document_type: document_type,
                    status: 'PENDING'
                }
            });

            res.status(200).json({
                success: true,
                message: 'KYC document uploaded successfully',
                data: kyc
            });
        } catch (error) {
            console.error('KYC Upload Error:', error);
            // remove uploaded file in case of error
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    });
};

module.exports = { uploadKycDocument };
