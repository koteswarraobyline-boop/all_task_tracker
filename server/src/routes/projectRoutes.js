const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const projectController = require('../controllers/projectController');
const { authMiddleware } = require('../middleware/auth');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Validate file type (should be csv)
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      return cb(new Error('Only CSV files are allowed'), false);
    }
    cb(null, true);
  }
});

router.get('/', authMiddleware, projectController.getAllProjects);
router.delete('/:id', authMiddleware, projectController.deleteProject);
router.put('/:id/delivery-date', authMiddleware, projectController.updateProjectDeliveryDate);
router.post('/upload', authMiddleware, upload.single('file'), projectController.uploadProject);

module.exports = router;
