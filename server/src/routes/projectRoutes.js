const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const projectController = require('../controllers/projectController');
const exportController = require('../controllers/exportController');
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

const CSV_MAX_BYTES = Number(process.env.CSV_UPLOAD_MAX_MB || 10) * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: CSV_MAX_BYTES },
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
router.get('/:id/export/tasks', authMiddleware, exportController.exportProjectTasks);
router.get('/:id/delay-analysis', authMiddleware, projectController.getProjectDelayAnalysis);
router.put('/:id', authMiddleware, projectController.updateProject);
router.delete('/:id', authMiddleware, projectController.deleteProject);
router.put('/:id/delivery-date', authMiddleware, projectController.updateProjectDeliveryDate);
router.post('/upload', authMiddleware, upload.single('file'), projectController.uploadProject);

const wbsRoutes = require('./wbsRoutes');
router.use('/:id', wbsRoutes);

module.exports = router;
