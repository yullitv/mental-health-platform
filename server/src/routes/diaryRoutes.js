const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const requireRole = require('../middlewares/roleMiddleware');

router.post('/', requireRole('CLIENT'), diaryController.upsertEntry);
router.get('/mine', requireRole('CLIENT'), diaryController.getMyEntries);
router.post('/weekly-reflection', requireRole('CLIENT'), diaryController.generateWeeklyReflection);

module.exports = router;