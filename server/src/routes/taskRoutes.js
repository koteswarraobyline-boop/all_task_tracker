const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authMiddleware } = require('../middleware/auth');

// GET /projects/:id/tasks — admin only (clients use /client/:token/tasks)
router.get('/projects/:id/tasks', authMiddleware, taskController.getProjectTasks);

// POST /projects/:id/tasks — create single task
router.post('/projects/:id/tasks', authMiddleware, taskController.createTask);

// PUT /tasks/:id
router.put('/tasks/:id', authMiddleware, taskController.updateTask);

module.exports = router;
