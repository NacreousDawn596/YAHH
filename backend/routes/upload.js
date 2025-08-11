const multer = require('multer');
const express = require('express');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.post('/', authenticate, upload.array('images'), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No images uploaded' });
        }

        const imageUrls = files.map(file => `/uploads/${file.filename}`);
        res.json({ urls: imageUrls });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Server error while uploading images' });
    }
});

module.exports = router;