const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const exportController = require('../controllers/exportController');
const { authMiddleware } = require('../middleware/auth');

router.get('/global/export', authMiddleware, exportController.exportGlobalDashboard);
router.get('/global', authMiddleware, dashboardController.getGlobalDashboard);
router.get('/:projectId', authMiddleware, dashboardController.getProjectDashboard);

module.exports = router;
