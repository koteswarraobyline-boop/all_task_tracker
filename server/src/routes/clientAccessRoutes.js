const express = require('express');
const rateLimit = require('express-rate-limit');
const clientAccessController = require('../controllers/clientAccessController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

// Public client share-link validation + scoped tasks
router.get('/client/:token', tokenLimiter, clientAccessController.validateToken);
router.get('/client/:token/tasks', tokenLimiter, clientAccessController.getClientTasks);

// Admin CRUD for client access records
router.get('/client-access', authMiddleware, clientAccessController.listAccessRecords);
router.post('/client-access', authMiddleware, clientAccessController.createAccessRecord);
router.put('/client-access/:id', authMiddleware, clientAccessController.updateAccessRecord);
router.post('/client-access/:id/regenerate', authMiddleware, clientAccessController.regenerateToken);
router.delete('/client-access/:id', authMiddleware, clientAccessController.deleteAccessRecord);

module.exports = router;
