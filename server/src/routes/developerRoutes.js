const express = require('express');
const router = express.Router();
const developerController = require('../controllers/developerController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, developerController.getAllDevelopers);
router.get('/:id', authMiddleware, developerController.getDeveloperById);
router.post('/', authMiddleware, developerController.createDeveloper);
router.put('/:id', authMiddleware, developerController.updateDeveloper);
router.delete('/:id', authMiddleware, developerController.deleteDeveloper);

module.exports = router;
