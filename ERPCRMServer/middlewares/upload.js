const multer = require("multer");
const path = require("path");
const fs = require("fs");
const MAX_IMAGE_UPLOAD_SIZE = 15 * 1024 * 1024;

// Create upload directories
const createUploadDirs = () => {
    const dirs = ["uploads/users", "uploads/companies", "uploads/products"];
    dirs.forEach((dir) => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ Created directory: ${dir}`);
        }
    });
};

createUploadDirs();

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('image/');

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'));
    }
};

// Company storage
const companyStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = "uploads/companies";
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "company-" + uniqueSuffix + path.extname(file.originalname));
    },
});

// User storage
const userStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = "uploads/users";
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "user-" + uniqueSuffix + path.extname(file.originalname));
    },
});

// Multer instances
const uploadCompanyImage = multer({
    storage: companyStorage,
    fileFilter: fileFilter,
    limits: { fileSize: MAX_IMAGE_UPLOAD_SIZE }
});

const uploadUserImage = multer({
    storage: userStorage,
    fileFilter: fileFilter,
    limits: { fileSize: MAX_IMAGE_UPLOAD_SIZE }
});

const upload = multer({
    storage: companyStorage,
    fileFilter: fileFilter,
    limits: { fileSize: MAX_IMAGE_UPLOAD_SIZE }
});

// Error handler
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large',
                error: 'Maximum file size is 15MB. Large images are compressed in the browser before upload.'
            });
        }
        return res.status(400).json({
            success: false,
            message: 'File upload error',
            error: err.message
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            message: 'Upload failed',
            error: err.message
        });
    }
    next();
};

module.exports = {
    upload,
    uploadCompanyImage,
    uploadUserImage,
    handleUploadError
};
