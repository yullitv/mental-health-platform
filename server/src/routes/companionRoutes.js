const express = require('express');
const router = express.Router();
const companionController = require('../controllers/companionController');
const requireRole = require('../middlewares/roleMiddleware');

router.post('/message', requireRole('CLIENT'), companionController.sendMessage);

module.exports = router;
