const express = require('express');
const router = express.Router();
const safetyPlanController = require('../controllers/safetyPlanController');
const requireRole = require('../middlewares/roleMiddleware');

router.get('/mine', requireRole('CLIENT'), safetyPlanController.getMine);
router.put('/', requireRole('CLIENT'), safetyPlanController.upsert);

module.exports = router;
