const express = require('express');
const router = express.Router({ mergeParams: true });
const wbsController = require('../controllers/wbsController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/wbs', wbsController.getWbs);
router.post('/wbs/sync', wbsController.syncWbs);
router.post('/edit-unlock', wbsController.unlockEditing);

router.post('/nodes', wbsController.createNode);
router.put('/nodes/:nodeId', wbsController.updateNode);
router.delete('/nodes/:nodeId', wbsController.deleteNode);

router.post('/nodes/:nodeId/dependencies', wbsController.addDependency);
router.delete('/nodes/:nodeId/dependencies/:dependsOnId', wbsController.removeDependency);

router.get('/comments', wbsController.listComments);
router.post('/comments', wbsController.createComment);
router.put('/comments/:commentId', wbsController.updateComment);
router.delete('/comments/:commentId', wbsController.deleteComment);

router.get('/nodes/:nodeId/collab', wbsController.getNodeCollab);
router.post('/nodes/:nodeId/review-links', wbsController.createReviewLink);
router.delete('/review-links/:linkId', wbsController.deleteReviewLink);

router.get('/tasks/:taskId/collab', wbsController.getTaskCollab);
router.post('/tasks/:taskId/comments', wbsController.createTaskComment);
router.post('/tasks/:taskId/review-links', wbsController.createTaskReviewLink);

module.exports = router;
