const express = require('express');
const router = express.Router();
const companionController = require('../controllers/companionController');
const requireRole = require('../middlewares/roleMiddleware');
const { aiLimiter } = require('../middlewares/rateLimiters');

router.post('/message', requireRole('CLIENT'), aiLimiter, companionController.sendMessage);

module.exports = router;
