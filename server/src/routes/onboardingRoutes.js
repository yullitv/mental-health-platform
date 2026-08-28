const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const requireRole = require('../middlewares/roleMiddleware');

router.post('/', requireRole('CLIENT'), onboardingController.submitOnboarding);
router.get('/mine', requireRole('CLIENT'), onboardingController.getMyOnboarding);

module.exports = router;