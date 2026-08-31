const express = require('express');
const router = express.Router();
const thoughtAnalysisController = require('../controllers/thoughtAnalysisController');
const requireRole = require('../middlewares/roleMiddleware');

router.post('/', requireRole('CLIENT'), thoughtAnalysisController.analyzeThought);

module.exports = router;
