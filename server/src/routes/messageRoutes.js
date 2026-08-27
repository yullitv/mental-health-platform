const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const requireRole = require('../middlewares/roleMiddleware');

router.post('/', requireRole('CLIENT', 'SPECIALIST'), messageController.sendMessage);
router.get('/:sessionId', requireRole('CLIENT', 'SPECIALIST'), messageController.getSessionMessages);
router.put('/:sessionId/read', requireRole('CLIENT', 'SPECIALIST'), messageController.markAsRead);

module.exports = router;