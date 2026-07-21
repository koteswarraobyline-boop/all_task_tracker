const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// GET /projects/:id/tasks (Registered under root prefix or handled in app.js)
router.get('/projects/:id/tasks', taskController.getProjectTasks);

// PUT /tasks/:id
router.put('/tasks/:id', taskController.updateTask);

module.exports = router;
