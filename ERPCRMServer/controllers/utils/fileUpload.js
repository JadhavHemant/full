// utils/fileUpload.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MAX_IMAGE_UPLOAD_SIZE = 15 * 1024 * 1024;

// Create uploads directory if it doesn't exist
const createUploadDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Product Image Storage Configuration
const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/products';
        createUploadDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'product-' + uniqueSuffix + ext);
    }
});

// Company Logo Storage Configuration
const companyStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/companies';
        createUploadDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'logo-' + uniqueSuffix + ext);
    }
});

// File Filter (images only)
const imageFileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
};

// Upload configurations
const uploadProductImage = multer({
    storage: productStorage,
    limits: {
        fileSize: MAX_IMAGE_UPLOAD_SIZE
    },
    fileFilter: imageFileFilter
});

const uploadCompanyLogo = multer({
    storage: companyStorage,
    limits: {
        fileSize: MAX_IMAGE_UPLOAD_SIZE
    },
    fileFilter: imageFileFilter
});

// Delete file helper
const deleteFile = (filePath) => {
    try {
        if (filePath) {
            const fullPath = path.join(__dirname, '..', filePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log(`✅ File deleted: ${filePath}`);
            }
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }
};

module.exports = {
    uploadProductImage,
    uploadCompanyLogo,
    deleteFile
};
