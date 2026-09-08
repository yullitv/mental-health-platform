const express = require('express');
const router = express.Router();
const thoughtAnalysisController = require('../controllers/thoughtAnalysisController');
const requireRole = require('../middlewares/roleMiddleware');
const { aiLimiter } = require('../middlewares/rateLimiters');

router.post('/', requireRole('CLIENT'), aiLimiter, thoughtAnalysisController.analyzeThought);

module.exports = router;
