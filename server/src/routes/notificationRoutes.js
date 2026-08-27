const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const requireRole = require('../middlewares/roleMiddleware');

router.get('/', requireRole('CLIENT', 'SPECIALIST', 'ADMIN'), notificationController.getMyNotifications);
router.put('/read-all', requireRole('CLIENT', 'SPECIALIST', 'ADMIN'), notificationController.markAllAsRead);
router.put('/:id/read', requireRole('CLIENT', 'SPECIALIST', 'ADMIN'), notificationController.markAsRead);

module.exports = router;