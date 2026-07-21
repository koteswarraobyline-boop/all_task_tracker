const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/:projectId', dashboardController.getProjectDashboard);

module.exports = router;
