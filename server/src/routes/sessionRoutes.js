const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const requireRole = require('../middlewares/roleMiddleware');

router.post('/book', requireRole('CLIENT'), sessionController.bookSlot);
router.get('/mine', requireRole('CLIENT', 'SPECIALIST'), sessionController.getMySessions);
router.get('/:id', requireRole('CLIENT', 'SPECIALIST'), sessionController.getSessionById);
router.put('/:id/complete', requireRole('SPECIALIST'), sessionController.completeSession);

module.exports = router;