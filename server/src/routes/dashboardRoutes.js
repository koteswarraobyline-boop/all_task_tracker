const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/auth');

router.get('/global', authMiddleware, dashboardController.getGlobalDashboard);
router.get('/:projectId', authMiddleware, dashboardController.getProjectDashboard);

module.exports = router;
